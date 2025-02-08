/**
 * CodeMirror 括号处理扩展
 * 提供智能括号处理功能，包括自动补全、包围选中文本、回车处理等
 */
((mod) => {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})((CodeMirror) => {
  "use strict";

  /**
   * 定义扩展选项，设置事件监听器
   * @param {CodeMirror} cm - CodeMirror实例
   * @param {boolean} val - 选项值
   * @param {*} old - 旧值
   */
  CodeMirror.defineOption("smartBrackets", false, (cm, val, old) => {
    if (!val) return;
    cm.off("keypress", handleKeypress);
    cm.off("keydown", handleKeydown);
    cm.on("keypress", handleKeypress);
    cm.on("keydown", handleKeydown);
  });

  // 定义括号配对关系
  const brackets = {
    "(": ")",
    "[": "]",
    "{": "}",
    "'": "'",
    "\"": "\"",
    "`": "`",
  };

  /**
   * 判断字符是否为左括号
   * @param {string} char - 需要判断的字符
   * @returns {boolean} 是否为左括号
   */
  const isOpenBracket = (char) => Object.keys(brackets).includes(char);

  /**
   * 判断字符是否为右括号
   * @param {string} char - 需要判断的字符
   * @returns {boolean} 是否为右括号
   */
  const isCloseBracket = (char) => Object.values(brackets).includes(char);

  /**
   * 获取左括号对应的右括号
   * @param {string} open - 左括号
   * @returns {string} 对应的右括号
   */
  const getCloseBracket = (open) => brackets[open];

  /**
   * 处理按键输入，实现括号补全和包围功能
   * @param {CodeMirror} cm - CodeMirror实例
   * @param {Event} event - 键盘事件对象
   */
  const handleKeypress = (cm, event) => {
    const char = String.fromCharCode(event.charCode);
    const isLeftBracket = isOpenBracket(char);
    const isRightBracket = isCloseBracket(char);

    if (!isLeftBracket && !isRightBracket) return;

    const pos = cm.getCursor();
    const line = cm.getLine(pos.line);
    const nextChar = line.charAt(pos.ch);
    const close = getCloseBracket(char);

    /**
     * 处理左括号 自动补全右括号
     */
    const autocomplete = () => {
      event.preventDefault();
      if (cm.somethingSelected()) {
        // 对选中文本进行括号包围
        cm.listSelections().forEach(selection => {
          const text = cm.getRange(selection.anchor, selection.head);
          cm.replaceRange(char + text + close, selection.anchor, selection.head);
        });
      } else {
        cm.replaceRange(char + close, pos);
        cm.setCursor({ line: pos.line, ch: pos.ch + 1 });
      }
    };
    

    /**
     * 处理右括号输入
     */
    const handleRightBracket = () => {
      event.preventDefault();
      cm.setCursor({ line: pos.line, ch: pos.ch + 1 });
    };
    
    
    /*
     *处理符号
     *
     */
    const handlePunctuation = () => char === nextChar ? handleRightBracket() : autocomplete();
        

    // 根据不同情况处理
    if (isLeftBracket === isRightBracket) {
      handlePunctuation();
    } else if (isLeftBracket) {
      autocomplete();
    } else if (isRightBracket) {
      char === nextChar && handleRightBracket();
    }
    
  };
  

  /**
   * 处理特殊按键事件（回车和退格）
   * @param {CodeMirror} cm - CodeMirror实例
   * @param {Event} event - 键盘事件对象
   */
  const handleKeydown = (cm, event) => {
    if (event.key === "Enter") {
      handleEnter(cm, event);
    } else if (event.key === "Backspace") {
      handleBackspace(cm, event);
    }
  };

  /**
   * 处理回车键，在括号对中间回车时进行智能换行和缩进
   * @param {CodeMirror} cm - CodeMirror实例
   * @param {Event} event - 键盘事件对象
   */
  const handleEnter = (cm, event) => {
    const pos = cm.getCursor();
    const line = cm.getLine(pos.line);
    const prevChar = line.charAt(pos.ch - 1);
    const nextChar = line.charAt(pos.ch);

    // 检查是否在括号对中间
    if (isOpenBracket(prevChar) && isCloseBracket(nextChar)) {
      event.preventDefault();

      // 获取当前缩进并添加额外缩进
      const indentation = line.match(/^\s*/)[0];
      const tabSize = cm.getOption("indentUnit");
      const extraIndent = " ".repeat(tabSize);

      // 插入新行并设置缩进
      const newLine = "\n" + indentation + extraIndent + "\n" + indentation;
      cm.replaceRange(newLine, pos);

      // 将光标移动到中间行
      cm.setCursor({
        line: pos.line + 1,
        ch: indentation.length + tabSize
      });
    }
  };

  /**
   * 处理退格键，在空括号对中间时同时删除两个括号
   * @param {CodeMirror} cm - CodeMirror实例
   * @param {Event} event - 键盘事件对象
   */
  const handleBackspace = (cm, event) => {
    if (cm.somethingSelected()) return;

    const pos = cm.getCursor();
    const line = cm.getLine(pos.line);
    const prevChar = line.charAt(pos.ch - 1);
    const nextChar = line.charAt(pos.ch);

    // 检查是否在空括号对中间
    if (isOpenBracket(prevChar) && nextChar === getCloseBracket(prevChar)) {
      event.preventDefault();
      // 同时删除左右括号
      cm.replaceRange("",
        { line: pos.line, ch: pos.ch - 1 },
        { line: pos.line, ch: pos.ch + 1 }
      );
    }
  };
});