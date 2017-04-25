const { Subject } = require('rxjs')

class ObservablePool extends Subject {
  constructor(ItemConstructor) {
    super()
    this.items = []
    this.ItemConstructor = ItemConstructor
  }

  _findItem(filter) {
    let items = this.items
    for (let i = 0; i < items.length; i++) {
      if (filter(items[i])) {
        return items[i]
      }
    }
  }

  _createItem() {
    let item = new this.ItemConstructor()
    let items = this.items

    let subscription = item.subscribe({
      complete: () => {
        subscription.unsubscribe()

        if (!this.isStopped) {
          for (let i = 0; i < items.length; i++) {
            if (items[i] === item) {
              items.splice(i, 1)
              break
            }
          }
          this.next(item)
        }
      },
    })

    items.push(item)
    return item
  }

  get(filter) {
    return this._findItem(filter) || this._createItem()
  }

  complete() {
    if (this.isStopped) {
      return
    }

    super.complete()
    this.items.forEach((item) => item.complete())
    this.items = null
    this.ItemConstructor = null
  }

  error(err) {
    if (this.isStopped) {
      return
    }

    super.error(err)
    this.items.forEach((item) => item.error(err))
    this.items = null
    this.ItemConstructor = null
  }
}

module.exports = ObservablePool
