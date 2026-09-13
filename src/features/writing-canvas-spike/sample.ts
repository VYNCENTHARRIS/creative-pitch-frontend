import type { JSONContent } from '@tiptap/core'
import type { WorkingDocument } from './types'

const text = (value: string): JSONContent => ({ type: 'text', text: value })
const paragraph = (value: string): JSONContent => ({ type: 'paragraph', content: [text(value)] })
const heading = (value: string, level: number): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [text(value)],
})
const listItem = (value: string): JSONContent => ({ type: 'listItem', content: [paragraph(value)] })

export const sample: WorkingDocument = {
  title: 'The Room That Changes Every Hour',
  document: {
    type: 'doc',
    content: [
      heading('The hook', 1),
      {
        type: 'paragraph',
        content: [
          text('One ordinary room becomes '),
          { ...text('a new world every hour'), marks: [{ type: 'bold' }] },
          text('. Three guests must discover what changed and decide what to do with it.'),
        ],
      },
      paragraph(
        'At first, only the light is different. Then a familiar chair is gone. A door appears where a window used to be. Each small discovery changes the story the guests thought they were telling.',
      ),
      heading('How it works', 2),
      {
        type: 'bulletList',
        content: [
          listItem('A simple room, three curious guests, and one visible clock.'),
          listItem('Each change introduces a shared problem to solve.'),
          listItem('The audience notices a clue before the guests do.'),
        ],
      },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          listItem('Meet the room and make a prediction.'),
          listItem('Watch the first change and follow the clues.'),
          listItem('Choose what to keep when the next hour begins.'),
        ],
      },
      heading('Why someone would keep watching', 3),
      {
        type: 'paragraph',
        content: [
          text('The appeal is '),
          { ...text('curiosity, not competition'), marks: [{ type: 'italic' }] },
          text(
            '. Every answer leaves a small question open, and the guests have time to disagree, laugh, and change their minds.',
          ),
        ],
      },
      paragraph(
        'The camera stays close enough to catch quiet reactions. A guest might recognize an object from an earlier hour while another is still searching for the missing chair. The room becomes a shared memory, full of choices that seemed unimportant at the time.',
      ),
      paragraph(
        'An episode ends when the guests agree on one object to carry into the next hour. Their choice gives the audience something concrete to anticipate. What they leave behind may matter just as much as what they keep.',
      ),
      paragraph(
        'For a longer writing test, expand one change into a scene. Describe what each guest notices first, what the audience can see, and the moment a small detail changes the conversation. Let the document grow naturally as the idea takes shape.',
      ),
      {
        type: 'paragraph',
        content: [
          text('Synthetic reference: '),
          {
            ...text('example.com'),
            marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
          },
          text('. This sample is a Design preview, not a real pitch.'),
        ],
      },
    ],
  },
}
