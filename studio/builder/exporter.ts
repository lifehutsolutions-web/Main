import { Project } from '../types';
import { RenderEngine } from '../library/RenderEngine';

/**
 * Delegated to the single RenderEngine module for architecture freezing.
 */
export function generateExportHtml(project: Project): string {
  return RenderEngine.render(project, { isPreview: false });
}
