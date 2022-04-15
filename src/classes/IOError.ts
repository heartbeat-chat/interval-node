export type IOErrorKind = 'CANCELED' | 'TRANSACTION_CLOSED'

export default class IOError extends Error {
  kind: IOErrorKind

  constructor(kind: IOErrorKind, message?: string) {
    super(message)
    this.kind = kind
  }
}