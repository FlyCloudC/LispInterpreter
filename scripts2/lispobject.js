class LispObject {
  isList() { return false; }
  toString() {
    return `<${this.constructor.name.slice(4).toLowerCase()}>`;
  }
}

class LispPair extends LispObject {
  constructor(car, cdr) {
    super();
    this.car = car;
    this.cdr = cdr;
  }
  isList() {
    return this.cdr.isList();
  }
  toString() {
    if (this.isList()) {
      let res = [];
      for (let p = this; p instanceof LispPair; p = p.cdr)
        res.push(p.car.toString())
      return `(${res.join(' ')})`;
    }
    else
      return `(${this.car} . ${this.cdr})`;
  }
}
class LispEmptyList extends LispObject {
  constructor() {
    if (LispEmptyList.instance)
      return LispEmptyList.instance;
    LispEmptyList.instance = this; //不好看
  }
  isList() { return true; }
  toString() { return '()'; }
}
class LispNumber extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value.toString(); }
}
class LispCharacter extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value.toString(); }
}
class LispString extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value; }
}
class LispVector extends LispObject {
  constructor(ls) { super(); this.value = ls; }
  toString() { return `#(${this.value.join(' ')})` }
}
class LispSymbol extends LispObject {
  constructor(str) { super(); this.value = Symbol.for(str); }
  toString() { return Symbol.keyFor(this.value); }
}
class LispBoolean extends LispObject {
  constructor(value) { super(); this.value = value; }
  toString() { return this.value ? '#t' : '#f'; }
}
const LispTrue = new LispBoolean(true);
const LispFalse = new LispBoolean(false);
class LispHashtables extends LispObject { }
class LispProceedure extends LispObject {
  constructor(name) { super(); this.name = name; }
  toString() {
    return this.name ? `#<procedure ${this.name}>` : '#<procedure>';
  }
}
class CompoundProcedure extends LispProceedure {
  constructor(vars, bproc, env, name) {
    super();
    this.vars = vars;
    this.bproc = bproc;
    this.env = env;
    this.name = name;
  }
}
class LispVoid extends LispObject {
  constructor() { super(); }
  toString() { return ''; }
}
const LispVoidObj = new LispVoid();
