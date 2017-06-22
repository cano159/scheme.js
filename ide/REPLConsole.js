﻿var REPLConsole = function() {
    var container = new UI.Panel();
    container.setId('console');

    var historyLook = new HistoryLook();
    var consoleInput;
    var self = container;

    container.clear = function() {
        container.dom.innerHTML = "<p>" + window.localeBundle.getString('WelcomeTo')
            + "<a target=\"_blank\" href=\"http://github.com/hlpp/scheme.js\" style=\"color:blue\">scheme.js</a>.</p>";
    }
    
    container.resetInput = function() {
        $(container.dom).append("<p class=\"code_echo\"><span class=\"prompt\">&gt;</span><input type=\"text\" id=\"consoleInput\" /></p>");
        consoleInput = $("#consoleInput");
        consoleInput.keydown(consoleInputKeyDown);
        consoleInput.focus();
    }

    function consoleInputKeyDown(event) {
        switch(event.keyCode) {
        case 13://enter
            if(consoleInput.val().trim().length) {
                historyLook.push(consoleInput.val());
                historyLook.lastInput = null;
                scheme.evalStringWithEnv(consoleInput.val(), scheme.globalEnv);
                self.echoCodeAndResetInput();
            }
            break;
        case 38://up
            if(historyLook.lastInput == null)
                historyLook.lastInput = consoleInput.val().trim();
            if(historyLook.hasPrev()) {
                consoleInput.val(historyLook.prev());
                moveToEnd(consoleInput);
            }
            break;
        case 40://down
            if(historyLook.lastInput == null)
                historyLook.lastInput = consoleInput.val().trim();
            if(historyLook.hasNext())
                consoleInput.val(historyLook.next());
            else {
                historyLook.bottom();
                consoleInput.val(historyLook.lastInput);
            }
            moveToEnd(consoleInput);
            break;
        default:
            if(!historyLook.hasNext())
                historyLook.lastInput = consoleInput.val().trim() + String.fromCharCode(event.keyCode);
        }
        
        function moveToEnd(obj) {
            obj = obj.get(0);
            obj.focus(); 
            var len = obj.value.length; 
            if (document.selection) { 
                var sel = obj.createTextRange(); 
                sel.moveStart('character', len);
                sel.collapse(); 
                sel.select(); 
            } else if (typeof obj.selectionStart == 'number' && typeof obj.selectionEnd == 'number') { 
                obj.selectionStart = obj.selectionEnd = len; 
            } 
        } 
    }
    
    container.echoCodeAndResetInput = function() {
        var p = consoleInput.parent();
        consoleInput.remove();
        p.children().first().addClass("dead");
        var codeSpan = $(document.createElement("span"));
        codeSpan.append(consoleInput.val());
        p.append(codeSpan);
        self.resetInput();
    }
    
    /*
     @param type  "write","display","error" or null
    */
    container.log = function(type, info) {
        if(typeof info == "string")
            info = info.replace(/\n/g, "</br>").replace(/\s/g, "&nbsp;");
        var response = $(document.createElement('span'));
        response.addClass("scheme_response");
        if(type == "write")
            response.addClass("scheme_write_object");
        else if(type == "display")
            response.addClass("scheme_write_object");
        else if(type == "error")
            response.addClass("scheme_error_info");
        response.html(info);
        $(container.dom).append(response);
    }
    
    function HistoryLook() {
        var inputs = [];
        var index = 0;
        
        this.lastInput = null;
        this.push = function(input) {
            inputs.push(input);
            index = inputs.length;
        }
        this.hasPrev = function() { return index - 1 >= 0; }
        this.hasNext = function() { return index + 1 <= inputs.length - 1; }
        this.prev = function() { return inputs[--index]; }
        this.next = function() { return inputs[++index]; }
        this.bottom = function() { index = inputs.length; }
    }

    return container;
}

