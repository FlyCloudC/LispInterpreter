class ParseError extends Error { }

function parse(code) {
  const strls = ` ${code}\n`
    .replace('\'()', 'nil') //临时补丁
    .replace(/;(.*?)\n/g, '') //去掉注释
    .replaceAll('(', ' ( ') //给括号两边加空格
    .replaceAll(')', ' ) ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' '); //按空格把c1分成数组
  if (strls.length === 1 && strls[0] === '')
    return [];

  const expStack = [[]];
  let top = 0;
  for (const v of strls) {
    switch (v) {
      case '(':
        expStack[++top] = [];
        break;
      case ')':
        if (top === 0)
          throw new ParseError(`unexpected ')'`);
        expStack[top - 1].push(expStack[top]);
        --top;
        break;
      default:
        expStack[top].push(v);
    }
  }
  if (top !== 0)
    throw new ParseError(`missing ${top} ')'`);

  return expStack[0];
}
