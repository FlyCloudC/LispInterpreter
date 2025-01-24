class LispExpression {
  constructor(g, k, isTail) {
    this.g = g; //g: env,cc => {}
    this.isTail = isTail;
  }
}

class LispIdExpression extends LispExpression {
  constructor(id, k) {
    const g = env => env.look(id);
    super(g, k);
  }
}

class LispComposeExpression extends LispExpression {
  constructor(child, k) {
    super(g, k);
  }
}
