/**
 * @fileoverview minilight - minimal syntax highlighting library
 * @version 1.0.0
 * @license MIT
 * @copyright 2016 asvd <heliosframework@gmail.com>, 2022 dmfrancisco <hello@dmfranc.com>
 */

const TokenTypes = {
  whitespace: 0, // anything else (whitespaces / newlines)
  operator: 1, // operator or brace
  closingBrace: 2, // closing braces (after which '/' is division not regex)
  word: 3, // word or keyword
  regex: 4, // regex
  stringDouble: 5, // string starting with "
  stringSingle: 6, // string starting with '
  xmlComment: 7, // xml comment  <!-- -->
  multiLineComment: 8, // multiline comment /* */
  singleLineCommentSlash: 9, // single-line comment starting with two slashes //
  singleLineCommentHash: 10, // single-line comment starting with hash #
};

const CommentTokenTypes = [
  TokenTypes.xmlComment,
  TokenTypes.multiLineComment,
  TokenTypes.singleLineCommentSlash,
  TokenTypes.singleLineCommentHash,
];

const defaultConfig = {
  styles: {
    unformatted: "",
    punctuation: "opacity: 0.5",
    keyword: "font-weight: 600",
    string: "opacity: 0.7",
    comment: "font-style: italic; opacity: 0.5",
  },
  // prettier-ignore
  keywords: [
    "abstract", "alias", "and", "arguments", "array", "asm", "assert", "auto",
    "base", "begin", "bool", "boolean", "break", "byte", "case", "catch",
    "char", "checked", "class", "clone", "compl", "const", "continue",
    "debugger", "decimal", "declare", "default", "defer", "deinit", "delegate",
    "delete", "do", "double", "echo", "elif", "else", "elseif", "elsif", "end",
    "ensure", "enum", "event", "except", "exec", "explicit", "export",
    "extends", "extension", "extern", "fallthrough", "false", "final",
    "finally", "fixed", "float", "for", "foreach", "friend", "from", "func",
    "function", "global", "goto", "guard", "if", "implements", "implicit",
    "import", "include", "include_once", "init", "inline", "inout",
    "instanceof", "int", "interface", "internal", "is", "lambda", "let",
    "lock", "long", "module", "mutable", "namespace", "NaN", "native", "new",
    "next", "nil", "not", "null", "object", "operator", "or", "out",
    "override", "package", "params", "private", "protected", "protocol",
    "public", "raise", "readonly", "redo", "ref", "register", "repeat",
    "require", "require_once", "rescue", "restrict", "retry", "return",
    "sbyte", "sealed", "self", "short", "signed", "sizeof", "static",
    "string", "struct", "subscript", "super", "switch", "synchronized",
    "template", "then", "this", "throw", "throws", "transient", "true", "try",
    "typealias", "typedef", "typeid", "typename", "typeof", "unchecked",
    "undef", "undefined", "union", "unless", "unsigned", "until", "use",
    "using", "var", "virtual", "void", "volatile", "wchar_t", "when", "where",
    "while", "with", "xor", "yield",
  ],
};

export const minilight = (el, config = {}) => {
  const styles = { ...defaultConfig.styles, ...config.styles };
  const keywords = config.keywords || defaultConfig.keywords;

  const text = el.textContent;
  let pos = 0; // current position
  let next1 = text[0]; // next character
  let char = 1; // current character
  let prev1; // previous character
  let prev2; // the one before the previous
  let token = ""; // current token content
  let tokenType = TokenTypes.whitespace; // current token type
  let lastTokenType; // kept to determine between regex and division
  let multichar; // flag determining if token is multi-character

  el.innerHTML = ""; // Clean the node

  const shouldFinalizeToken = () => {
    if (!char) return true; // end of content

    switch (tokenType) {
      case TokenTypes.whitespace:
        return /\S/.test(char); // whitespaces get merged
      case TokenTypes.operator:
      case TokenTypes.closingBrace:
        return true;
      case TokenTypes.word:
        return !/[$\w]/.test(char);
      case TokenTypes.regex:
        return (prev1 === "/" || prev1 === "\n") && multichar;
      case TokenTypes.stringDouble:
      case TokenTypes.stringSingle:
        return prev1 === '"' && multichar;
      case TokenTypes.xmlComment:
        return text[pos - 4] + prev2 + prev1 === "-->";
      case TokenTypes.multiLineComment:
        return prev2 + prev1 === "*/";
      case TokenTypes.singleLineCommentSlash:
      case TokenTypes.singleLineCommentHash:
        return char === "\n"; // single-line comments end with a newline
    }
  };

  const getStyle = () => {
    switch (tokenType) {
      case TokenTypes.whitespace:
        return styles.unformatted;

      case TokenTypes.operator:
      case TokenTypes.closingBrace:
        return styles.punctuation;

      case TokenTypes.word:
        return keywords.includes(token) ? styles.keyword : styles.unformatted;

      case TokenTypes.regex:
      case TokenTypes.stringDouble:
      case TokenTypes.stringSingle:
        return styles.string;

      case TokenTypes.xmlComment:
      case TokenTypes.multiLineComment:
      case TokenTypes.singleLineCommentSlash:
      case TokenTypes.singleLineCommentHash:
        return styles.comment;
    }
  };

  const getTokenType = () => {
    if (char == "#") {
      return TokenTypes.singleLineCommentHash;
    } else if (char + next1 == "//") {
      return TokenTypes.singleLineCommentSlash;
    } else if (char + next1 == "/*") {
      return TokenTypes.multiLineComment;
    } else if (char + next1 + text[pos + 1] + text[pos + 2] == "<!--") {
      return TokenTypes.xmlComment;
    } else if (char == "'") {
      return TokenTypes.stringSingle;
    } else if (char == '"') {
      return TokenTypes.stringDouble;
    } else if (
      char == "/" &&
      // previous token was an opening brace or an operator (otherwise division, not a regex)
      [TokenTypes.whitespace, TokenTypes.operator].includes(lastTokenType) &&
      // workaround for xml closing tags
      prev1 != "<"
    ) {
      return TokenTypes.regex;
    } else if (/[$\w]/.test(char)) {
      return TokenTypes.word;
    } else if (/[\])]/.test(char)) {
      return TokenTypes.closingBrace;
    } else if (/[\/{}[(\-+*=<>:;|\\.,?!&@~]/.test(char)) {
      return TokenTypes.operator;
    } else {
      return TokenTypes.whitespace;
    }
  };

  // running through characters and highlighting
  while (
    ((prev2 = prev1),
    // escaping if needed (with except for comments)
    // previous character will not be therefore
    // recognized as a token finalize condition
    (prev1 = tokenType < 7 && prev1 == "\\" ? 1 : char))
  ) {
    char = next1;
    next1 = text[++pos];
    multichar = token.length > 1;

    // checking if current token should be finalized
    if (shouldFinalizeToken()) {
      // appending the token to the result
      if (token) {
        // remapping token type into style
        // (some types are highlighted similarly)
        const node = document.createElement("span");
        const style = getStyle();
        if (style) node.setAttribute("style", style);
        node.appendChild(document.createTextNode(token));
        el.appendChild(node);
      }

      // saving the previous token type (skipping whitespaces and comments)
      if (tokenType !== TokenTypes.whitespace && !CommentTokenTypes.includes(tokenType)) {
        lastTokenType = tokenType;
      }
      token = ""; // initializing a new token
      tokenType = getTokenType(); // determining the new token type
    }

    token += char;
  }
};
