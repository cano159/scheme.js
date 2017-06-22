var SchemeMenu = function(ide) {
    var container = new UI.Panel();
    container.setClass('menu');

    var title = new UI.Panel();
    title.setClass('title');
    title.setTextContent('Scheme');
    container.add(title);

    var items = new UI.Panel();
    items.setClass('menuitems');
    container.add(items);


    var item = new UI.Row();
    item.setClass('menuitem');
    item.setTextContent(window.localeBundle.getString('Run'));
    item.onClick(function() {
        ide.replConsole.clear();
        scheme.evalStringWithNewEnv(ide.editor.getValue());
        ide.replConsole.resetInput();
    });
    items.add(item);

    return container;
}