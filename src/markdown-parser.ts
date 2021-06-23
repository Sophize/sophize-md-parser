import MarkdownIt from "markdown-it";
import { ResourcePointer } from "sophize-datamodel";
import { LinkPlugin } from "./link-plugin";
import tokensToAST from "./md-utils";
import { CaseOption } from "./resource-display-options";
import { TexmathPlugin } from "./texmath-plugin";

export class MarkdownParser {
  private md: any;
  constructor() {
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })
      .use(TexmathPlugin)
      .use(LinkPlugin);
  }

  parse(
    mdString: string,
    contextPtr?: ResourcePointer,
    plainText?: boolean,
    caseOption?: CaseOption
  ) {
    if (!mdString) return [];
    return tokensToAST(
      this.md.parse(mdString, { contextPtr, plainText, caseOption })
    );
  }

  parseInline(
    mdString: string,
    contextPtr?: ResourcePointer,
    plainText?: boolean,
    caseOption?: CaseOption
  ) {
    if (!mdString) return [];
    return tokensToAST(
      this.md.parseInline(mdString, { contextPtr, plainText, caseOption })
    );
  }
}
