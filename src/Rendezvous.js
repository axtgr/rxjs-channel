const { ReplaySubject } = require('rxjs');


module.exports =
class Rendezvous extends ReplaySubject {
  constructor() {
    super(1);
    this.hasValue = false;
    this.isResolved = false;
  }

  checkResolve() {
    if (!this.isResolved && this.putOp && this.takeOp && this.hasValue) {
      this.isResolved = true;
      this.next(this.value);
      this.complete();
    }
  }

  setOp(kind, op) {
    if (this.isResolved) {
      throw new Error('Cannot set an op on a resolved match');
    }

    this[kind + 'Op'] = op;
    this.checkResolve();
  }

  setValue(value) {
    if (this.isResolved) {
      throw new Error('Cannot set a value on a resolved match');
    }

    this.value = value;
    this.hasValue = true;
    this.checkResolve();
  }
};
