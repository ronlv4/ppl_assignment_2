import { Exp, Program } from '../imp/L3-ast';
import {Result, makeFailure, bind, mapResult, makeOk, safe2, safe3} from '../shared/result';
import {
    AppExp, AtomicExp, CExp, CompoundExp, LetExp, LitExp, PrimOp, ProcExp,
    isAppExp, isAtomicExp, isBoolExp, isCExp, isCompoundExp, isDefineExp, isExp, isIfExp,
    isLetExp, isLitExp, isNumExp, isPrimOp, isProcExp, isProgram, isStrExp, isVarRef,
    makeAppExp, makeProcExp,
} from "./L31-ast";
import {map} from "ramda";
import {isSymbolSExp} from "../imp/L3-value";


/*
Purpose: Transform L3 AST to JavaScript program string
Signature: l30ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/
export const l30ToJS = (exp: Exp | Program): Result<string>  =>
    isProgram(exp) ? bind(mapResult(l30ToJS, exp.exps), exps => makeOk(exps.join(";\n"))) :
    isExp(exp) ? convertL30ExpToJS(exp):
    makeFailure("unvalid expression");

/*
Purpose: rewrite a single LetExp as a lambda-application form
Signature: rewriteLet(cexp)
Type: [LetExp => AppExp]
*/
export const rewriteLet = (e: LetExp): AppExp => {
    const vars = map((b) => b.var, e.bindings);
    const vals = map((b) => b.val, e.bindings);
    return makeAppExp(
        makeProcExp(vars, e.body),
        vals);
}

export const convertL30ExpToJS = (exp: Exp): Result<string> =>
    isDefineExp(exp) ? bind(convertL30CExpToJS(exp.val), val => makeOk(`const ${exp.var.var} = ${val}`)) :
    isCExp(exp) ? convertL30CExpToJS(exp):
    makeFailure("unvalid exp");

export const convertL30CExpToJS = (cexp: CExp): Result<string> =>
    isAtomicExp(cexp) ? convertL30AtomicExpToJS(cexp) :
    isCompoundExp(cexp) ? convertL30CompoundExpToJS(cexp) :
    makeFailure("Unexpected CExp");

export const convertL30AtomicExpToJS = (aExp: AtomicExp): Result<string> =>
//    AtomicExp = NumExp | BoolExp | StrExp | PrimOp | VarRef;
    isNumExp(aExp) ? makeOk(aExp.val.toString()) :
    isBoolExp(aExp) ? makeOk(aExp.val ? "true" : "false") :
    isStrExp(aExp) ? makeOk('"' + aExp.val + '"') :
    isPrimOp(aExp) ? makeOk(convertPrimOpToJS(aExp.op)) :
    isVarRef(aExp) ? makeOk(aExp.var) :
    aExp

export const convertL30CompoundExpToJS = (compExp: CompoundExp): Result<string> =>
    //CompoundExp = AppExp | IfExp | ProcExp | LetExp | LetPlusExp | LitExp;
    isIfExp(compExp) ? safe3((test: string, then: string, alt: string) => makeOk(`(${test} ? ${then} : ${alt})`))
        (convertL30CExpToJS(compExp.test), convertL30CExpToJS(compExp.then), convertL30CExpToJS(compExp.alt)) :
    isProcExp(compExp) ? convertL30ProcExpToJS(compExp) :
    isLetExp(compExp) ? convertL30CompoundExpToJS(rewriteLet(compExp)) :
    isAppExp(compExp) ?
        (
            isPrimOp(compExp.rator) ? convertAppPrimOpToJS(compExp.rator, compExp.rands) :
            safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
            (convertL30CExpToJS(compExp.rator), mapResult(convertL30CExpToJS, compExp.rands))
        ) :
    isLitExp(compExp) ? convertL30SExpToJS(compExp) :
    makeFailure("unknown compound expression: " + compExp.tag)

export const convertPrimOpToJS = (op: string) : string =>
    op === "not" ? "!" :
    op === "eq?" || op === "=" || op === "string=?" ? "===" :
    op === "string?" ? '((x) => (typeof (x) === string))' :
    op === "number?" ? "((x) => (typeof (x) === number))" :
    op === "boolean?" ? "((x) => (typeof (x) === boolean))" :
    op === "symbol?" ? "((x) => (typeof (x) === symbol))" :
    op

export const convertAppPrimOpToJS = (rator: PrimOp, rands: CExp[]): Result<string> =>
    rator.op === "not" ? bind(convertL30CExpToJS(rands[0]), (rand : string) => makeOk("(!" + rand + ")")) :
    rator.op === "number?" || rator.op === "boolean?" ? bind(convertL30CExpToJS(rands[0]), (rand : string) => makeOk(`(${convertPrimOpToJS(rator.op)}(${rands[0]}))`)) :
    bind(mapResult(convertL30CExpToJS,rands), (rands) => makeOk("(" + rands.join(" " + convertPrimOpToJS(rator.op) + " ") + ")"));

export const convertL30SExpToJS = (sExp: LitExp): Result<string> =>
    isSymbolSExp(sExp.val) ? makeOk('Symbol.for(\"' + sExp.val.val + '\")') :
    makeFailure(sExp.val.toString())

export const convertL30ProcExpToJS = (procExp: ProcExp): Result<string> =>
    procExp.body.length === 1 ?
        (
            bind(convertL30CExpToJS(procExp.body[procExp.body.length-1]), body => makeOk("(" + "(" +
            map((p) => p.var, procExp.args).join(",") + ") => " + body + ")"))
        ) :
    bind(mapResult(convertL30CExpToJS, procExp.body),
        body => makeOk("((" +
            map((p) => p.var, procExp.args).join(",") +
            ") => {" +
            body.slice(0,body.length-1).join("; ") +
            "; return " +
            body[body.length-1] +
            ";})"))
