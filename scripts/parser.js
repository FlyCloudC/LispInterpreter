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

  const lp = strls.filter(v => v === '(').length;
  const rp = strls.filter(v => v === ')').length;
  if (lp > rp)
    throw new ParseError(`missing ${lp - rp} ')'`);
  else if (rp > lp)
    throw new ParseError(`there are ${rp - lp} more ')'`);

  const expStack = [[]];
  let top = 0;
  for (const v of strls) {
    switch (v) {
      case '(':
        expStack[++top] = [];
        break;
      case ')':
        expStack[top - 1].push(expStack[top]);
        --top;
        break;
      default:
        expStack[top].push(v);
    }
  }

  return expStack[0];
}
