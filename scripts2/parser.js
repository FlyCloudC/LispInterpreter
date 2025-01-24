class ParseError extends Error { }

function parse(code) {
  let strls = ` ${code}\n`
    .replace(/;(.*?)\n/g, '') //去掉注释

  let token = [];
  let p = 0;
  function read() {
    if (p === strls.length)
      return -1;
    else
      return strls[p++];
  }

  let x, tmp = '';
  do {
    x = read();
    if (['#', '\'', '(', ')', '[', ']', '`'].includes(x))
      token.push(x);
    else
      tmp += x;

  } while (1);//todo
}
