class LispError extends Error {
  constructor(lispMessage, from) {
    if (from) {
      super(`Exception in ${from}: ${lispMessage}`);
    } else {
      super(`Exception: ${lispMessage}`);
    }
    this.lispMessage = lispMessage;
    this.from = from;
  }
}
class LispSyntaxError extends LispError {
  constructor(exp) {
    super(`invalid syntax ${exp}`);
    this.exp = exp;
  }
}

class LispEnvironment {
  constructor(nextFrame) {
    this.bindings = {};
    this.nextFrame = nextFrame;
  }
  bindVaribale(symbol, value) {
    const id = symbol.value;
    if (value instanceof LispProceedure &&
      value.name === undefined)
      value.name = id;
    thie.frame[id] = value;
  }
  look(symbol) {
    const id = symbol.value;
    if (id in this.bindings)
      return this.bindings[id];
    else if (this.nextFrame)
      return this.nextFrame.look(id);
    else
      throw new LispError(`${id} is not bound`);
  }
}

