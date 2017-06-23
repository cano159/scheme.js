﻿/*
  包含eval-apply循环
  以及eval过程，evalObjects、evalString等外部接口。
 */
(function(scheme){
"use strict";

scheme.initEval = function(env) {
    scheme.addPrimProc(env, "eval", eval_prim, 2);
}

scheme.apply = apply;


scheme.evalString = function(str) {
    return scheme.evalStringWithEnv(str, scheme.globalEnv);
}

scheme.evalStringWithNewEnv = function(str) {
    return scheme.evalStringWithEnv(str, scheme.makeGlobalEnv());
}

scheme.evalStringWithEnv = function(str, env) {
    scheme.restError();
    var exps;
    try {
        exps = scheme.readMutil(str);
    } catch(e) {
        if(e instanceof scheme.Error)
            scheme.outputError();
        console.error(e);
    }
    return scheme.evalObjects(exps, env);
}

scheme.evalObjects = function(exps, env) {
    scheme.restError();
    var valObj;
    try {
        for(var idx = 0; idx < exps.length; idx++) {
            valObj = evaluate(exps[idx], env);
            scheme.outputValue(valObj);
        }
    } catch(e) {
        if(e instanceof scheme.Error)
            scheme.outputError();
        console.error(e);
    }
    return valObj;//last value
}

function eval_prim(argv) {
    var exp = argv[0];
    var env = argv[1];
    if(!scheme.isNamespace(env))
        return scheme.wrongContract("meval", "namespace?", 0, argv);
    return evaluate(exp, env.val);
}

//-------------
// evaluations
//-------------
function evaluate(exp, env) {
    while(true) {
        if(scheme.error)
            throw scheme.error;
        if(exp == scheme.voidValue) {
            return exp;
        } else if(scheme.isNumber(exp)
               || scheme.isChar(exp)
               || scheme.isString(exp)
               || scheme.isBoolean(exp)) { // self evaluating
            return exp;
        } else if(scheme.isSymbol(exp)) {
            return scheme.lookup(exp, env);
        } else if(scheme.isPair(exp)) {
            var operator = scheme.operator(exp); 
            if(scheme.isSymbol(operator)) {
                switch(operator) {
                    case scheme.quoteSymbol:
                        // eval quotation
                        return scheme.quoteObject(exp);
                    case scheme.assignmentSymbol:
                        return evalAssignment(exp, env);
                    case scheme.defineSymbol:
                        return evalDefinition(exp, env);
                    case scheme.ifSymbol:
                        // eval if
                        var alt; // optional
                        exp = scheme.isTrue(evaluate(scheme.ifPredicate(exp), env)) ?
                            scheme.ifConsequent(exp) : (alt = scheme.ifAlternative(exp),
                                                        scheme.isEmptyList(alt) ? scheme.voidValue : alt);
                        continue;
                    case scheme.lambdaSymbol:
                        return evalLambda(exp, env);
                    case scheme.beginSymbol:
                        // eval sequence
                        var exps = scheme.beginActions(exp);
                        if(!scheme.isEmptyList(exps)) {
                            for(; ! scheme.isEmptyList( scheme.cdr(exps) ); exps = scheme.cdr(exps) )
                                evaluate(scheme.car(exps), env);
                            exp = scheme.car(exps); // last exp
                            continue;
                        } else {
                            return scheme.voidValue;
                        }
                    case scheme.letSymbol:
                        return evaluate(scheme.letToCombination(exp), env);
                    case scheme.condSymbol:
                        return evaluate(scheme.transformCond(exp), env);
                    case scheme.caseSymbol:
                        return evaluate(scheme.transformCase(exp), env);
                    case scheme.andSymbol:
                        return evaluate(scheme.transformAnd(exp), env);
                    case scheme.orSymbol:
                        return evaluate(scheme.transformOr(exp), env);
                    case scheme.whenSymbol:
                        return evaluate(scheme.transformWhen(exp), env);
                    case scheme.unlessSymbol:
                        return evaluate(scheme.transformUnless(exp), env);
                    case scheme.doSymbol:
                        return evaluate(scheme.transformDo(exp), env);
                    case scheme.whileSymbol:
                        return evaluate(scheme.transformWhile(exp), env);
                    case scheme.forSymbol:
                        return evaluate(scheme.transformFor(exp), env);
                    default: {}
                }
            }


            // apply
            var procedure = evaluate(operator, env);
            var argv = arrayOfValues(scheme.operands(exp), env);
            if(scheme.isPrim(procedure)) {
                return applyPrimitiveProcedure(procedure, argv);
            } else if(scheme.isComp(procedure)) {
                var ok = matchArity(procedure, argv);
                if(ok) {
                    exp = scheme.makeBegin(procedure.val.getBody());
                    env = makeProcedureApplyEnv(procedure, argv);
                }
                continue;
            } else {
                scheme.applicationError(procedure);
            }

        } else {
            return scheme.throwError('eval', "unknown expression type");
        }
    }
}

// 应用:求值过程调用
function apply(procedure, argv) {
    if(scheme.isPrim(procedure)) {
        return applyPrimitiveProcedure(procedure, argv);
    } else if(scheme.isComp(procedure)) {
        var ok = matchArity(procedure, argv);
        if(ok) {
            //在这个新环境上下文中求值过程体
            return evaluate(scheme.makeBegin(procedure.val.getBody()), makeProcedureApplyEnv(procedure, argv));
        }
    } else {
        scheme.applicationError(procedure);
    }
}

function makeProcedureApplyEnv(procedure, argv) {
    //将形式参数约束于对应到实际参数
    var bindings = {};
    var paramters = procedure.val.getParamters();
    var arity = procedure.val.getArity();
    var argvList = scheme.arrayToList(argv);
    if(arity.length == 1) {     // 0个或固定数量参数
        for(var index = 0; index < paramters.length; index++)
            bindings[paramters[index].val] = argv[index];
    } else if(arity[0] > 0 && arity[1] == -1) {   // n或更多个参数
        var index;
        for(index = 0; index < paramters.length - 1; index++)
            bindings[paramters[index].val] = argv[index];
        bindings[paramters[index].val] = scheme.arrayToList(argv.slice(index));
    } else if(arity[0] == 0) {    // n个参数
        bindings[paramters[0].val] = argvList;
    }
    //参考JS的arguments特性
    bindings["arguments"] = argvList;
    bindings["callee"] = procedure;
    
    //构造一个新环境,将创建该过程时的环境作为外围环境
    return scheme.extendEnv(bindings, procedure.val.getEnv());
}

function applyPrimitiveProcedure(procedure, argv) {
    var ok = matchArity(procedure, argv);
    if(ok) {
        return procedure.val.getFunc()(argv);
    }
}

function arrayOfValues(operands, env) {
    var values = [];
    while(!scheme.isEmptyList(operands)) {
        values.push(evaluate(scheme.car(operands), env));
        operands = scheme.cdr(operands);
    }
    return values;
}

function evalAssignment(exp, env) {
    scheme.setVariableValue(scheme.assignmentVar(exp), evaluate(scheme.assignmentVal(exp), env), env);
    return scheme.voidValue;
}

function evalDefinition(exp, env) {
    var variable = scheme.definitionVar(exp);
    if(!scheme.isSymbol(variable))
        return scheme.throwError('define', "not an identifier: " + scheme.writeToString(variable));
    var value = evaluate(scheme.definitionVal(exp), env);
    if(scheme.isComp(value))
        value.val.setName(scheme.symbolVal(variable));
    scheme.defineVariable(variable, value, env);
    return scheme.voidValue;
}

function evalLambda(exp, env) {
    //计算参数数量
    var formals = scheme.lambdaParamters(exp);
    var paramters = [];//参数数组
    var minArgs, maxArgs;
    if(scheme.isPair(formals)) {
        var isList = false;
        var listLen = 0;
        for(var obj = formals; !isList && scheme.isPair(obj); obj = scheme.cdr(obj)) {
            listLen++;
            paramters.push(scheme.car(obj));
            if(scheme.isEmptyList(scheme.car(obj)))
                isList = true;
        }
        if(!scheme.isEmptyList(obj))
            paramters.push(obj);
        else
            isList = scheme.isEmptyList(obj);
        if(isList) {
            minArgs = listLen;
            maxArgs = undefined;
        } else {
            minArgs = listLen;
            maxArgs = -1;
        }
    }
    else if(scheme.isSymbol(formals)) {
        paramters.push(formals);
        minArgs = 0;
        maxArgs = -1;
    }
    else if(scheme.isEmptyList(formals)) {
        minArgs = 0;
        maxArgs = undefined;
    }
    else {
        return scheme.throwError('','not an identifier');
    }
    //做一个过程
    return scheme.makeCompoundProcedure("", paramters, scheme.lambdaBody(exp), env, minArgs, maxArgs);
}

function matchArity(procedure, argv) {
    var arity = procedure.val.getArity();
    var min = arity[0];
    var mismatch = false;
    var isAtleast = false;
    var expected = "";
    if(arity.length == 1) {
        if(argv.length != min)
            mismatch = true;
        expected = min;
    }
    else if(arity.length == 2) {
        var max;
        if(arity[1] != -1) {
            max = arity[1];
            expected = min + " to " + max;
        } else {
            max = 0x3FFFFFFE;
            expected = min;
            isAtleast = true;
        }
        if(!(min <= argv.length && argv.length <= max))
            mismatch = true;
    }
    if(mismatch) 
        scheme.arityMismatchError(procedure.val.getName(), argv, isAtleast, expected, argv.length);
    return !mismatch;
}

})(scheme);
