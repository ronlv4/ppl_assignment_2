import { Exp, Program } from '../imp/L3-ast';
import {Result, makeFailure, bind, mapResult, makeOk, safe2, safe3} from '../shared/result';
import {
    Binding,
    CExp, isAppExp,
    isBoolExp,
    isCExp,
    isDefineExp,
    isExp, isIfExp, isLetExp, isLetPlusExp, isLitExp,
    isNumExp, isPrimOp, isProcExp,
    isProgram,
    isStrExp, isVarRef, makeAppExp, makeBinding,
    makeDefineExp, makeIfExp, makeLetExp, makeProcExp,
    makeProgram, PrimOp
} from "./L31-ast";
import {L31CExpToL3, L31ExpToL3, rewriteLetPlusExp} from "./q3";
import {map, zipWith} from "ramda";

export const convertL30ExpToJS = (exp: Exp): Result<string> =>
    isDefineExp(exp) ? bind(convertL30CExpToJS(exp.val), val => makeOk(`const ${exp.var.var} = ${val}`)) :
    isCExp(exp) ? convertL30CExpToJS(exp):
    makeFailure("unvalid exp");

export const convertL30CExpToJS = (cexp: CExp): Result<string> =>
    isNumExp(cexp) ? makeOk(cexp.val.toString()) :
    isBoolExp(cexp) ? makeOk(cexp.val ? "true" : "false") :
    isStrExp(cexp) ? makeOk(cexp.val) :
    isPrimOp(cexp) ? makeOk(convertPrimOpToJS(cexp.op)) :
    isVarRef(cexp) ? makeOk(cexp.var) :
    isIfExp(cexp) ? safe3((test: string, then: string, alt: string) => makeOk(`(${test} ? ${then} : ${alt})`))
        (convertL30CExpToJS(cexp.test), convertL30CExpToJS(cexp.then), convertL30CExpToJS(cexp.alt)) :
    isAppExp(cexp) ?
        (
            isPrimOp(cexp.rator) ? convertAppPrimOpToJS(cexp.rator, cexp.rands) :
                safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
                (convertL30CExpToJS(cexp.rator), mapResult(convertL30CExpToJS, cexp.rands))
        ) :
    // isAppExp(cexp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
    //     (L31CExpToL3(cexp.rator), mapResult(L31CExpToL3, cexp.rands)) :
    isProcExp(cexp) ? bind(convertL30CExpToJS(cexp.body[cexp.body.length-1]), body => makeOk("(" + "(" +
            map((p) => p.var, cexp.args).join(",") + ") => " + body + ")")) :

    // isLetExp(cexp) ? safe2((vals : CExp[], body: CExp[]) => makeOk(convertL30CExpToJS(zipWith(makeBinding,map(binding => binding.var.var, cexp.bindings), vals), body)))
    //     (mapResult((binding : Binding ) => convertL30CExpToJS(binding.val), cexp.bindings), mapResult(convertL30CExpToJS,cexp.body)) :
    isLitExp(cexp) ? (makeOk("\\" + cexp + "\\")) :
    makeFailure("Unexpected CExp");

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
    ;; <prim-op>  ::= + | - | * | / | < | > | = | not | and | or | eq? | string=?
    ;;                  | cons | car | cdr | pair? | number? | list
    ;;                  | boolean? | symbol? | string?      ##### L3
*/

export const convertPrimOpToJS = (op: string) : string =>
    op === "not" ? "!" :
    op === "eq?" || op === "=" ? "===" :
    op === "string=?" || op === "string?" ? "(x) => typeof (x) === string" :
    op === "number?" ? "(x) => typeof (x) === number" :
    op === "boolean?" ? "(x) => typeof (x) === boolean" :
    op === "symbol?" ? "(x) => typeof (x) === symbol" :
    op

export const convertAppPrimOpToJS = (rator: PrimOp, rands: CExp[]): Result<string> =>
    rator.op === "not" ? bind(convertL30CExpToJS(rands[0]), (rand : string) => makeOk("(!" + rand + ")")) :
    rator.op === "number?" || rator.op === "boolean?" ? bind(convertL30CExpToJS(rands[0]), (rand : string) => makeOk(`${convertPrimOpToJS(rator.op)}(${rands[0]})`)) :
    bind(mapResult(convertL30CExpToJS,rands), (rands) => makeOk("(" + rands.join(" " + convertPrimOpToJS(rator.op) + " ") + ")"));


