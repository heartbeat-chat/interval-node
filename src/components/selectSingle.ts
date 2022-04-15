import type { T_IO_PROPS, T_IO_RETURNS } from '../ioSchema'

export default function selectSingle<Props extends T_IO_PROPS<'SELECT_SINGLE'>>(
  props: Props
) {
  type Options = typeof props['options']
  const optionMap = new Map(props.options.map(o => [o.value, o]))

  return {
    getValue(response: T_IO_RETURNS<'SELECT_SINGLE'>) {
      return optionMap.get(response.value) as Options[0]
    },
  }
}
