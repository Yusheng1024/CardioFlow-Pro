// 1. 網頁進入點
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('CardioFlow Pro - 題庫管理系統')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 取得試算表 Working Sheet 的通用函式
function getSheet() {
  const SPREADSHEET_ID = '1xyiz2FOsUBQrSyii4gwyS8RisN84nPrTkLjlHlUFkAQ';
  const sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName('Questions');

  if (!sheet) {
    throw new Error('找不到工作表：Questions');
  }

  return sheet;
}

// 2. 接收單筆新增/更新的題目，並寫入 Google 試算表
function saveQuestionToSheet(data) {
  try {
    var sheet = getSheet();
    var rows = sheet.getDataRange().getValues();
    var targetRowIndex = -1;

    // 檢查該 ID 是否已經存在於試算表中（從第 2 列開始查找）
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        targetRowIndex = i + 1; // 轉換為 Sheet 列數 (1-based index)
        break;
      }
    }

    var rowData = [
      data.id,
      data.title,
      data.category,
      data.difficulty,
      data.desc,
      data.params.ava,
      data.params.pvr,
      data.params.portalRes,
      data.params.hr,
      data.options[0],
      data.options[1],
      data.options[2],
      data.options[3],
      data.correctIndex,
      data.rationale,
      data.enabled !== false
    ];

    if (targetRowIndex > 0) {
      // 找到舊 ID：更新該列
      sheet.getRange(targetRowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // 未找到：新增至最下方
      sheet.appendRow(rowData);
    }

    return { success: true, status: 'success', message: '已成功同步儲存至 Google 試算表！' };
  } catch (error) {
    return { success: false, status: 'error', message: error.toString() };
  }
}

// 3. 批量同步整套題庫至 Google 試算表 (覆寫全部)
function saveQuestionsToSheet(questionsList) {
  try {
    var sheet = getSheet();
    // 清除 Header 以外的舊資料
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }

    if (!questionsList || questionsList.length === 0) {
      return { status: 'success', message: '試算表已清空' };
    }

    var matrix = questionsList.map(function(q) {
      return [
        q.id,
        q.title,
        q.category,
        q.difficulty,
        q.desc,
        q.params.ava,
        q.params.pvr,
        q.params.portalRes,
        q.params.hr,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        q.correctIndex,
        q.rationale,
        q.enabled !== false
      ];
    });

    sheet.getRange(2, 1, matrix.length, matrix[0].length).setValues(matrix);
    return { status: 'success', message: '已全量同步至試算表' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// 4. 從 Google 試算表讀取所有題目至前端網頁
function getQuestionsFromSheet() {
  try {
    var sheet = getSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return []; // 只有標題列或空表

    var data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // 跳過空列

      result.push({
        id: row[0],
        title: String(row[1] == null ? '' : row[1]),
        category: String(row[2] == null ? '' : row[2]),
        difficulty: String(row[3] == null ? '' : row[3]),
        desc: String(row[4] == null ? '' : row[4]),
        params: {
          ava: Number(row[5]),
          pvr: Number(row[6]),
          portalRes: Number(row[7]),
          hr: Number(row[8])
        },
        options: [
          String(row[9] == null ? '' : row[9]),
          String(row[10] == null ? '' : row[10]),
          String(row[11] == null ? '' : row[11]),
          String(row[12] == null ? '' : row[12])
        ],
        correctIndex: Number(row[13]),
        rationale: String(row[14] == null ? '' : row[14]),
        enabled: String(row[15]).toUpperCase() !== 'FALSE'
      });
    }

    return result;
  } catch (err) {
    console.error('讀取題庫失敗：', err);
    throw err;
  }
}

function getEnabledQuestionsFromSheet() {
  return getQuestionsFromSheet().filter(question => question.enabled);
}

function testSheetConnection() {
  const sheet = getSheet();

  Logger.log('工作表名稱：' + sheet.getName());
  Logger.log('最後一列：' + sheet.getLastRow());
  Logger.log('讀到題目數：' + getQuestionsFromSheet().length);
}