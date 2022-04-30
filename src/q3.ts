import {
    Binding,
    CExp,
    Exp, isAppExp, isBoolExp,
    isCExp,
    isDefineExp,
    isExp, isIfExp, isLetExp,
    isLetPlusExp, isLitExp,
    isNumExp, isPrimOp, isProcExp,
    isProgram, isStrExp, isVarRef, LetExp, LetPlusExp, makeAppExp, makeBinding,
    makeDefineExp, makeIfExp, makeLetExp, makeLetPlusExp, makeProcExp, makeProgram,
    Program
} from "./L31-ast";
import {Result, makeFailure, bind, mapResult, makeOk, safe2, safe3} from "../shared/result";
import {map, zipWith} from "ramda";
import {first, rest} from "../shared/list";
import exp from "constants";


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult(L31ExpToL3, exp.exps), (exps: Exp[]) => makeOk(makeProgram(exps))) :
    isExp(exp) ? L31ExpToL3(exp):
    makeFailure("unvalid expressions")

export const L31ExpToL3 = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? bind(L31CExpToL3(exp.val), (val:CExp) => makeOk(makeDefineExp(exp.var, val))) :
    isCExp(exp) ? L31CExpToL3(exp):
    makeFailure("unvalid")

export const rewriteLetPlusExp = (cexp: LetPlusExp): LetExp =>
    cexp.bindings.length == 1 ? makeLetExp(cexp.bindings, cexp.body):
    makeLetExp([first(cexp.bindings)], [rewriteLetPlusExp(makeLetPlusExp(rest(cexp.bindings),cexp.body))]);

export const L31CExpToL3 = (cexp: CExp): Result<CExp> =>
    isNumExp(cexp) ? makeOk(cexp) :
    isBoolExp(cexp) ? makeOk(cexp) :
    isStrExp(cexp) ? makeOk(cexp) :
    isPrimOp(cexp) ? makeOk(cexp) :
    isVarRef(cexp) ? makeOk(cexp) :
    isAppExp(cexp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
                            (L31CExpToL3(cexp.rator), mapResult(L31CExpToL3, cexp.rands)) :
    isIfExp(cexp) ? safe3((test: CExp, then: CExp, alt: CExp) => makeOk(makeIfExp(test, then, alt)))
        (L31CExpToL3(cexp.test), L31CExpToL3(cexp.then), L31CExpToL3(cexp.alt)) :
    isProcExp(cexp) ? bind(mapResult(L31CExpToL3, cexp.body), (body: CExp[]) => makeOk(makeProcExp(cexp.args, body))) :
    isLetExp(cexp) ? safe2((vals : CExp[], body: CExp[]) => makeOk(makeLetExp(zipWith(makeBinding,map(binding => binding.var.var, cexp.bindings), vals), body)))
            (mapResult((binding : Binding ) => L31CExpToL3(binding.val), cexp.bindings), mapResult(L31CExpToL3,cexp.body)) :
    isLetPlusExp(cexp) ? makeOk(rewriteLetPlusExp(cexp)):
    isLitExp(cexp) ? makeOk(cexp) :
    makeFailure("Unexpected CExp");