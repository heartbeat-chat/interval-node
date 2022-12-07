import { z } from 'zod'
import fetch from 'cross-fetch'
import * as superjson from 'superjson'
import Logger from './Logger'
import Interval, {
  IntervalActionDefinition,
  IntervalError,
  Page,
  QueuedAction,
} from '..'
import { ENQUEUE_ACTION, DEQUEUE_ACTION } from '../internalRpcSchema'
import { Ctx } from 'evt'

/**
 * This is effectively a namespace inside of Interval with a little bit of its own state.
 */
export default class Routes {
  protected interval: Interval
  #logger: Logger
  #apiKey?: string
  #endpoint: string
  #groupChangeCtx: Ctx<void>

  constructor(
    interval: Interval,
    endpoint: string,
    logger: Logger,
    ctx: Ctx<void>,
    apiKey?: string
  ) {
    this.interval = interval
    this.#apiKey = apiKey
    this.#logger = logger
    this.#endpoint = endpoint + '/api/actions'
    this.#groupChangeCtx = ctx
  }

  #getAddress(path: string): string {
    if (path.startsWith('/')) {
      path = path.substring(1)
    }

    return `${this.#endpoint}/${path}`
  }

  async enqueue(
    slug: string,
    { assignee, params }: Pick<QueuedAction, 'assignee' | 'params'> = {}
  ): Promise<QueuedAction> {
    let body: z.infer<typeof ENQUEUE_ACTION['inputs']>
    try {
      const { json, meta } = params
        ? superjson.serialize(params)
        : { json: undefined, meta: undefined }
      body = ENQUEUE_ACTION.inputs.parse({
        assignee,
        slug,
        params: json,
        paramsMeta: meta,
      })
    } catch (err) {
      this.#logger.debug(err)
      throw new IntervalError('Invalid input.')
    }

    const response = await fetch(this.#getAddress('enqueue'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.#apiKey}`,
      },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(r => ENQUEUE_ACTION.returns.parseAsync(r))
      .catch(err => {
        this.#logger.debug(err)
        throw new IntervalError('Received invalid API response.')
      })

    if (response.type === 'error') {
      throw new IntervalError(
        `There was a problem enqueuing the action: ${response.message}`
      )
    }

    return {
      id: response.id,
      assignee,
      params,
    }
  }

  async dequeue(id: string): Promise<QueuedAction> {
    let body: z.infer<typeof DEQUEUE_ACTION['inputs']>
    try {
      body = DEQUEUE_ACTION.inputs.parse({
        id,
      })
    } catch (err) {
      this.#logger.debug(err)
      throw new IntervalError('Invalid input.')
    }

    const response = await fetch(this.#getAddress('dequeue'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.#apiKey}`,
      },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(r => DEQUEUE_ACTION.returns.parseAsync(r))
      .catch(err => {
        this.#logger.debug(err)
        throw new IntervalError('Received invalid API response.')
      })

    if (response.type === 'error') {
      throw new IntervalError(
        `There was a problem enqueuing the action: ${response.message}`
      )
    }

    let { type, params, paramsMeta, ...rest } = response

    if (paramsMeta && params) {
      params = superjson.deserialize({ json: params, meta: paramsMeta })
    }

    return {
      ...rest,
      params,
    }
  }

  add(slug: string, route: IntervalActionDefinition | Page) {
    if (!this.interval.config.routes) {
      this.interval.config.routes = {}
    }

    if (route instanceof Page) {
      route.onChange.attach(this.#groupChangeCtx, () => {
        this.interval.client?.handleActionsChange(this.interval.config)
      })
    }

    this.interval.config.routes[slug] = route
    this.interval.client?.handleActionsChange(this.interval.config)
  }

  remove(slug: string) {
    for (const key of ['routes', 'actions', 'groups'] as const) {
      const routes = this.interval.config[key]

      if (!routes) continue
      const route = routes[slug]
      if (!route) continue

      if (route instanceof Page) {
        route.onChange.detach(this.#groupChangeCtx)
      }

      delete routes[slug]

      this.interval.client?.handleActionsChange(this.interval.config)
      return
    }
  }
}
