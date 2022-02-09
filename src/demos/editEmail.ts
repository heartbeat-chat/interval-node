import { IntervalActionHandler } from '..'
import { fakeDb } from './helpers'

const editEmailForUser: IntervalActionHandler = async io => {
  console.log("Let's say hello...")

  const initialUsers = await fakeDb.find('')

  const resp = await io.renderGroup([
    io.display.heading('Edit email address for user'),
    io.select.single(
      'Select a user',
      {
        options: initialUsers,
        searchable: true,
      },
      async newState => {
        const resp = await fakeDb.find(newState.queryTerm || '')
        return { options: resp }
      }
    ),
    io.select.single('Choose role', {
      options: [
        { label: 'Admin', value: 'a' },
        { label: 'Editor', value: 'b' },
        { label: 'Viewer', value: 'b' },
      ],
    }),
    io.input.text('Enter their new name'),
    io.input.email('Enter their new email'),
    io.input.number('Enter an amount'),
    io.input.boolean('Are you sure?'),
    io.select.single('Select an opt', {
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    }),
    io.select.multiple('Select some opts', {
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    }),
    io.select.table('Select from this table', {
      data: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c', extraData: true },
      ],
    }),
  ])
  io.renderGroup([
    io.display.heading('You successfully edited email for ' + resp[1].label),
  ])

  console.log('Resp', resp)
}

export default editEmailForUser