import { useParams } from 'react-router'
import { ConceptEditor } from '../features/concepts'

export function ConceptEditorPage() {
  const { conceptId } = useParams()
  return <ConceptEditor conceptId={conceptId === 'new' ? undefined : conceptId} />
}
