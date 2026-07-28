import type { DiagramConfig } from '../types/lesson';
import { PyramidDiagram } from './diagrams/PyramidDiagram';

interface DiagramSceneRendererProps {
  title: string;
  diagram: DiagramConfig;
}

export const DiagramSceneRenderer: React.FC<DiagramSceneRendererProps> = ({ title, diagram }) => {
  if (diagram.kind === 'pyramid') {
    return <PyramidDiagram title={title} tiers={diagram.tiers} />;
  }

  // Reaction diagrams (e.g. MnO2 + HCl) land in a later module.
  return null;
};
