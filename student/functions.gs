function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('CardioFlow Pro')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }