﻿(function(scheme){
"use strict";

scheme.error = null;

scheme.restError = function() { scheme.error = null; }

scheme.Error = function(objs) {
    this.objs = objs;
}

scheme.throwError = function() {
    scheme.error = new scheme.Error([].slice.call(arguments, 0));
    throw scheme.error;
}

scheme.arityMismatchError = function(procedureName, args, isAtleast, expected, given) {
    scheme.throwError("arityMismatch", procedureName, args, isAtleast, expected, given);
}

scheme.wrongContract = function(procedureName, expected, index, argv) {
    scheme.throwError("contractViolation", procedureName, expected, index, argv);
}

scheme.indexOutRangeError = function(procedureName, type, startIndex, endIndex, invalid, length, obj) {
    scheme.throwError("indexOutRange", procedureName, type, startIndex, endIndex, invalid, length, obj);
}

scheme.applicationError = function(given) {
    scheme.throwError("application", given);
}

scheme.outputError = function() {
    function getMutilLineArgStr(objs) {
        var str = "";
        objs.forEach(function(obj){
            str += "\n   " + scheme.displayToString(obj);
        });
        return str;
    }
    
    var error = scheme.error.objs;
    var errorType = error[0];
    var info;
    switch(errorType) {
    case "arityMismatch":
        var procedureName = error[1];
        var argv = error[2];
        var isAtleast = error[3];
        var expected = error[4];
        var given = error[5];
        info = procedureName + ": " + "arity mismatch;";
        info += "\n  the expected number of arguments does not match the given number";
        info += "\n  expected: " + (isAtleast ? "at least " : "") + expected;
        info += "\n  given: " + given;
        if(argv.length > 0)
            info += "\n  arguments...:" + getMutilLineArgStr(argv);
        break;
    case "contractViolation":
        var procedureName = error[1];
        var expected = error[2];
        var index = error[3];
        var argv = error[4];
        var given = argv[index];
        info = procedureName + ": " + "contract violation";
        info += "\n  expected: " + expected;
        info += "\n  given: " + scheme.writeToString(given);
        if(argv.length > 1) {
            info += "\n  argument position: " + (index + 1);
            var otherArgs = argv.filter(function(a,i){ return i != index; });
            info += "\n  other arguments...:" + getMutilLineArgStr(otherArgs);
        }
        break;
    case "indexOutRange":
        var procedureName = error[1];
        var type = error[2];
        var startIndex = error[3];
        var endIndex = error[4];
        var invalid = error[5];
        var length = error[6];
        var obj = error[7];
        info = procedureName + ": ";
        if(invalid == "index") {
            info += "index is out of range";
            if(length == 0) {
                info += " for empty " + type;
                info += "\n  index: " + startIndex;
            }
            else {
                info += "\n  index: " + startIndex;
                info += "\n  valid range: [0, " + (length - 1) + "]";
                info += "\n  " + type + ": " + scheme.writeToString(obj);
            }
        }
        else {
            if(invalid == "starting") {
                info += "starting index is out of range";
                info += "\n  starting index: " + startIndex;
                info += "\n  valid range: [0, " + length + "]";
            }
            else if(invalid == "ending") {
                info += "ending index is out of range";
                info += "\n  ending index: " + endIndex;
                info += "\n  starting index: " + startIndex;
                info += "\n  valid range: [0, " + length + "]";
            }
            info += "\n  " + type + ": " + scheme.writeToString(obj);
        }
        break;
    case "application":
        var given = error[1];
        info = "application: not a procedure;";
        info += "\n  expected a procedure that can be applied to arguments";
        info += "\n  given: " + scheme.writeToString(given);
        break;
    case "undefined":
        var id = error[1];
        info = id + ": undefined;";
        info += "\n cannot reference undefined identifier";
        break;
    case "error:":
        info = error[0];
    default:
        info = error[0] + ": " + error[1];
    }
    
    scheme.console && scheme.console.log("error", info);
    console.log(info);
}

scheme.outputOpenInputError = function(args) {
    var info = "open-input-file: " + "cannot open input file";
    info += "\n  path: " + args.filePath;
    if(args.errno == 404) {
        info += "\n  error: 找不到指定的文件。; errno=" + args.errno + ";"
    }
    if(scheme.console) {
        scheme.console.clear();
        scheme.console && scheme.console.log("error", info);
        scheme.console.resetInput();
    }
    console.log(info);

};

})(scheme);
