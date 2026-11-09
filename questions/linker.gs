const SHEET_NAME = "Questions";

function doGet(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEET_NAME);

  if (!sheet) {
    return respond({
      error: `找不到工作表：${SHEET_NAME}`
    }, e);
  }

  const values = sheet.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return respond([], e);
  }

  const headers = values[0].map(value => value.trim());
  const rows = values.slice(1);

  const questions = rows
    .filter(row => row.some(value => value.trim() !== ""))
    .map(row => {
      const record = {};

      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });

      // 若有 active 欄，只有 TRUE 的題目會提供給前端。
      // 若沒有 active 欄，則預設提供該題。
      const isActive =
        !("active" in record) ||
        String(record.active).trim().toUpperCase() === "TRUE";

      if (!isActive) return null;

      return {
        id: record.id,
        title: record.title,
        category: record.category,
        difficulty: record.difficulty,
        desc: record.desc,
        params: {
          ava: toNumber(record.ava, 3.5),
          pvr: toNumber(record.pvr, 2.0),
          portalRes: toNumber(record.portalRes, 1.0),
          hr: toNumber(record.hr, 75)
        },
        options: [
          record.optionA,
          record.optionB,
          record.optionC,
          record.optionD
        ],
        correctIndex: toNumber(record.correctIndex, 0),
        rationale: record.rationale
      };
    })
    .filter(question => question !== null);

  return respond(questions, e);
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function respond(data, e) {
  const json = JSON.stringify(data);
  const callback = e && e.parameter && e.parameter.callback;

  // 有 callback 時回傳 JSONP，讓單頁 HTML 可跨網域讀取。
  if (callback) {
    // 僅接受一般 JavaScript 函式名稱，避免 callback 被當成程式碼注入。
    if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
      return ContentService
        .createTextOutput("Invalid callback")
        .setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 沒有 callback 時，直接開啟網址會看到 JSON，方便檢查結果。
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const payloadText = e && e.parameter && e.parameter.payload;
    if (!payloadText) {
      return jsonResponse({
        success: false,
        error: "缺少 payload 參數"
      });
    }

    const questions = JSON.parse(payloadText);

    if (!Array.isArray(questions)) {
      return jsonResponse({
        success: false,
        error: "題庫格式必須是陣列"
      });
    }

    // 先檢查每題資料，避免格式錯誤時清空工作表
    for (const q of questions) {
      if (!q || !q.title || !Array.isArray(q.options)) {
        return jsonResponse({
          success: false,
          error: "題目資料格式錯誤"
        });
      }

      if (q.options.length !== 4) {
        return jsonResponse({
          success: false,
          error: `題目「${q.title}」必須有四個選項`
        });
      }
    }

    lock.waitLock(10000);

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({
        success: false,
        error: `找不到工作表：${SHEET_NAME}`
      });
    }

    const headers = [
      "id", "title", "category", "difficulty", "desc",
      "ava", "pvr", "portalRes", "hr",
      "optionA", "optionB", "optionC", "optionD",
      "correctIndex", "rationale", "active"
    ];

    const rows = questions.map(q => [
      q.id ?? "",
      q.title ?? "",
      q.category ?? "",
      q.difficulty ?? "",
      q.desc ?? "",
      q.params?.ava ?? 3.5,
      q.params?.pvr ?? 2.0,
      q.params?.portalRes ?? 1.0,
      q.params?.hr ?? 75,
      q.options[0] ?? "",
      q.options[1] ?? "",
      q.options[2] ?? "",
      q.options[3] ?? "",
      Number(q.correctIndex ?? 0),
      q.rationale ?? "",
      "TRUE"
    ]);

    // 以這次送來的題庫完整取代工作表舊題庫
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    return jsonResponse({
      success: true,
      savedCount: rows.length
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}