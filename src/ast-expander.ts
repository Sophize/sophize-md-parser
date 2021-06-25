import { firstValueFrom, Observable, Subscriber } from "rxjs";
import {
  Argument,
  Language,
  Proposition,
  Resource,
  ResourcePointer,
  ResourceType,
  Term,
} from "sophize-datamodel";
import {
  ResourceDisplayMode,
  ResourceDisplayOptions,
} from "./link-display-options";
import { LinkHelpers, LinkType } from "./link-helpers";
import { LinkContent } from "./link-plugin";
import { MarkdownParser } from "./markdown-parser";
import { AstNode } from "./md-utils";

const MAX_EXPANSION_LEVEL = 4;

export interface IResourceFetcher {
  (ptrs: ResourcePointer[]): Observable<Resource[]>;
}

export interface ILatexDefsFetcher {
  (l: Language, keys: string[]): Observable<string[]>;
}

function expandedMdForProposition(p: Proposition, positiveStatement: boolean) {
  if (positiveStatement || p.language === Language.MetamathSetMm) {
    return p.statement;
  }
  if (p.negativeStatement) return p.negativeStatement;
  return " _It is false that_: " + p.statement;
}

function expandedMdForArgument(a: Argument, options: ResourceDisplayOptions) {
  let expandedMd = "";
  if (!options.shouldShowArgTextOnly()) {
    expandedMd +=
      "Premises: " + a.premises?.map((p) => "#" + p.toString()) + "\\\n";
    expandedMd +=
      "Conclusion: " + a.conclusion
        ? "#" + a.conclusion.toString()
        : "" + "\n\n";
  }
  if (a.argumentText) expandedMd += a.argumentText;
  return expandedMd;
}

function expandedLink(
  link: LinkContent,
  resource: Resource,
  parser: MarkdownParser,
  getLatexDefs: ILatexDefsFetcher
): Promise<AstNode[]> {
  const {
    linkTarget: { linkType, propPtr, ptr },
    resourceDisplayOptions: options,
  } = link;
  let expandedMd = "";
  const language = (resource as any).language;
  const datasetId = (ptr || propPtr?.ptr)?.datasetId;
  const lookupTerms = ResourcePointer.fromStringArr(
    (resource as any).lookupTerms || [],
    datasetId
  );
  if (linkType === LinkType.RESOURCE_PTR) {
    switch (ptr.resourceType) {
      case ResourceType.TERM:
        expandedMd = (resource as Term).definition;
        break;
      case ResourceType.PROPOSITION:
        expandedMd = expandedMdForProposition(resource as Proposition, true);
        break;
      case ResourceType.ARGUMENT:
        expandedMd = expandedMdForArgument(resource as Argument, options);
        break;
    }
  } else if (linkType === LinkType.PROP_PTR) {
    expandedMd = expandedMdForProposition(
      resource as Proposition,
      !propPtr.negative
    );
  }
  const canApplyCase = LinkHelpers.canApplyCase(expandedMd);
  if (canApplyCase)
    expandedMd = LinkHelpers.applyCase(expandedMd, options.caseOption);

  return firstValueFrom(
    parser.parseSimple(expandedMd, getLatexDefs, {
      inline: true,
      language,
      lookupTerms,
      contextPtr: ptr || propPtr?.ptr,
      plainText: false,
      caseOption: canApplyCase ? null : options.caseOption,
      addNegationMarker:
        propPtr?.negative && language === Language.MetamathSetMm,
    })
  );
}

function getExpansionTarget(node: AstNode, resourceMap: Map<string, Resource>) {
  if (node.type !== "custom_link") return null;
  const content = node.content as LinkContent;
  const options = content?.resourceDisplayOptions;
  if (options?.getInputMode() !== ResourceDisplayMode.EXPAND) return null;
  const ptr = content.linkTarget?.ptr || content.linkTarget?.propPtr?.ptr;
  return resourceMap.get(ptr.toString());
}

async function expandAstWithResources(
  ast: AstNode[],
  resourceMap: Map<string, Resource>,
  parent: AstNode,
  parser: MarkdownParser,
  getLatexDefs: ILatexDefsFetcher
) {
  if (!ast) return;
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    const resource = getExpansionTarget(node, resourceMap);
    if (resource) {
      const expanded = await expandedLink(
        node.content,
        resource,
        parser,
        getLatexDefs
      );

      parent.children = [
        ...parent.children.slice(0, i),
        ...expanded[0].children, //[0].children // TODOX
        ...parent.children.slice(i + 1),
      ];
    }
    expandAstWithResources(
      node.children,
      resourceMap,
      node,
      parser,
      getLatexDefs
    );
  }
}

export function expandAst(
  expansionLevel: number,
  subscriber: Subscriber<AstNode[]>,
  ast: AstNode[],
  toExpand: Set<string>,
  resourceMap: Map<string, Resource>,
  parser: MarkdownParser,
  getResources: IResourceFetcher,
  getLatexDefs?: ILatexDefsFetcher
) {
  if (expansionLevel >= MAX_EXPANSION_LEVEL) {
    subscriber.complete();
    return;
  }
  const fetchList = [...toExpand].filter((p) => !resourceMap.has(p));
  const fetchPtrs = fetchList.map((s) => ResourcePointer.fromString(s));
  getResources(fetchPtrs).subscribe(async (resources) => {
    for (let i = 0; i < resources.length; i++) {
      resourceMap.set(fetchList[i], resources[i]);
    }
    await expandAstWithResources(ast, resourceMap, null, parser, getLatexDefs);
    toExpand = new Set<string>();
    getResourcesToExpand(ast, toExpand);
    subscriber.next(ast); // move outside to get more updates
    if (!toExpand.size) {
      subscriber.complete();
    } else {
      expandAst(
        expansionLevel + 1,
        subscriber,
        ast,
        toExpand,
        resourceMap,
        parser,
        getResources,
        getLatexDefs
      );
    }
  });
}

export function getResourcesToExpand(ast: AstNode[], toExpand: Set<string>) {
  if (!ast) return;
  for (const node of ast) {
    if (node.type === "custom_link") {
      const { resourceDisplayOptions: options, linkTarget } =
        node.content as LinkContent;
      if (options?.getInputMode() === ResourceDisplayMode.EXPAND) {
        const ptr = linkTarget.ptr || linkTarget.propPtr?.ptr;
        if (ptr) toExpand.add(ptr.toString());
      }
    }
    getResourcesToExpand(node.children, toExpand);
  }
}
