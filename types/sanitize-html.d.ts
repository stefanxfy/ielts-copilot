/**
 * types/sanitize-html.d.ts — sanitize-html 包的最小类型声明
 * (官方未发 @types/sanitize-html;M2/M3 工程引此包时给 TS 提示)
 */
declare module "sanitize-html" {
  interface IOptions {
    allowedTags?: string[] | false;
    allowedAttributes?: Record<string, string[]> | ((...args: unknown[]) => unknown);
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowedSchemesAppliedToAttributes?: string[];
    disallowedTagsMode?: "discard" | "escape" | "recursiveEscape";
    transformTags?: Record<string, ((tagName: string, attribs: Record<string, string>) => { tagName: string; attribs: Record<string, string> }) | string>;
    allowEmpty?: boolean;
    nonTextTags?: string[];
    nestingAllowed?: boolean;
  }
  function sanitizeHtml(dirty: string, options?: IOptions): string;
  export default sanitizeHtml;
  export { IOptions };
}