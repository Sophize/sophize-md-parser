import { LinkHelpers, LinkType, MdContext } from "./link-helpers";

const SIMPLE_LINK = /^#([a-zA-Z0-9\/:._|\~\-]+)/;
const SIMPLE_LINK_WITH_BRACKETS = /^#\(([a-zA-Z0-9\/:._|\~\-]+)\)/;
const TWO_PART_LINK_WITH_QUOTES =
  /^#\(\s*([a-zA-Z0-9\/:._\~\-]+)\s*,\s*('[^']*'\s*[^\)']*)\s*\)/;
const TWO_PART_LINK = /^#\(\s*([a-zA-Z0-9\/:._\~\-]+)\s*,\s*([^\)']+)\s*\)/;

export class LinkContent {
  // Create a new type 'LinkContext' when things become more complicated.
  linkContext: MdContext;
  constructor(
    public target: string,
    public display: string,
    public raw: string,
    viewerContext: MdContext,
    /* Link is responsible for the 1st character that is rendered by the markdown it is contained in.*/
    linkHasFirstCharacter: boolean
  ) {
    this.linkContext = LinkContent.getLinkContext(
      viewerContext,
      linkHasFirstCharacter
    );
  }

  public static getLinkContext(
    viewerContext: MdContext,
    linkHasFirstCharacter: boolean
  ): MdContext {
    if (linkHasFirstCharacter) return viewerContext;
    if (!viewerContext) return null;
    return {
      contextPtr: viewerContext.contextPtr,
      plainText: viewerContext.plainText,
      caseOption: null,
    };
  }
}
const EMPTY_CONTENT = new LinkContent(null, null, null, null, false);

function contextFromState(state): MdContext {
  if (!state?.env ) return null;
  return {
    contextPtr: state.env.contextPtr,
    plainText: state.env.plainText,
    caseOption: state.env.caseOption
  }
}

function isValidOpening(state, pos: number) {
  return true;
  // if (pos === 0) return true;
  // return /\s/.test(state.src.charAt(pos - 1)) || state.src.charAt(pos + 1) === '(';
}

function isLinkFirstCharacter(state: StaticRange, pos: number) {
  // Not 100% correct. What if starts with a link('[]()') or a heading ('# ')
  while (pos > 0 && /\s/.test(state[pos])) pos--;
  return pos === 0;
}

function linkFetch(state, silent: boolean) {
  if (state.src[state.pos] !== "#") {
    return false;
  }

  if (!isValidOpening(state, state.pos)) {
    if (!silent) {
      state.pending += "#";
    }
    state.pos += 1;
    return true;
  }
  const potentialString = state.src.substring(state.pos).split("\n")[0];
  const hasFirstCharacter = isLinkFirstCharacter(state, state.pos);

  const linkContent = getLinkContent(
    potentialString,
    contextFromState(state),
    hasFirstCharacter
  );
  if (!canBeValid(linkContent)) {
    if (!silent) {
      state.pending += "#";
    }
    state.pos += 1;
    return true;
  }

  if (!silent) {
    const token = state.push("custom_link", "link", 0);
    token.markup = "#";
    token.content = linkContent;
  }

  state.pos += linkContent.raw.length;
  return true;
}

function canBeValid(content: LinkContent) {
  return (
    content.raw &&
    content.raw.length &&
    LinkHelpers.getLinkTarget(content.target, content.linkContext.contextPtr)
      .linkType !== LinkType.UNKNOWN
  );
}

export function getLinkContent(
  potentialString: string,
  viewerContext: MdContext,
  hasFirstChar: boolean
) {
  if (potentialString.length < 2) return EMPTY_CONTENT;
  if (potentialString.charAt(1) !== "(") {
    if (!SIMPLE_LINK.test(potentialString)) return EMPTY_CONTENT;
    let raw = potentialString.match(SIMPLE_LINK)[0];
    let targetAndDisplay = potentialString.match(SIMPLE_LINK)[1];

    // Hack to allow fullstop after link. Remove last character if it is not alphanumeric.
    if (
      !targetAndDisplay
        .charAt(targetAndDisplay.length - 1)
        .match(/^[a-zA-Z0-9]$/)
    ) {
      raw = raw.substring(0, raw.length - 1);
      targetAndDisplay = targetAndDisplay.substring(
        0,
        targetAndDisplay.length - 1
      );
    }

    const [target, display] = targetAndDisplayInSimpleLink(targetAndDisplay);
    return new LinkContent(target, display, raw, viewerContext, hasFirstChar);
  }

  if (SIMPLE_LINK_WITH_BRACKETS.test(potentialString)) {
    const raw = potentialString.match(SIMPLE_LINK_WITH_BRACKETS)[0];
    const targetAndDisplay = potentialString.match(
      SIMPLE_LINK_WITH_BRACKETS
    )[1];
    const [target, display] = targetAndDisplayInSimpleLink(targetAndDisplay);
    return new LinkContent(target, display, raw, viewerContext, hasFirstChar);
  }

  if (TWO_PART_LINK_WITH_QUOTES.test(potentialString)) {
    const matches = potentialString.match(TWO_PART_LINK_WITH_QUOTES);
    return new LinkContent(
      matches[1],
      matches[2],
      matches[0],
      viewerContext,
      hasFirstChar
    );
  }
  if (TWO_PART_LINK.test(potentialString)) {
    const matches = potentialString.match(TWO_PART_LINK);
    return new LinkContent(
      matches[1],
      matches[2],
      matches[0],
      viewerContext,
      hasFirstChar
    );
  }
  return EMPTY_CONTENT;
}

function targetAndDisplayInSimpleLink(targetAndDisplay: string) {
  if (!targetAndDisplay) return [null, null];
  const splitIndex = targetAndDisplay.indexOf("|");
  if (splitIndex === -1) return [targetAndDisplay, null];
  return [
    targetAndDisplay.slice(0, splitIndex),
    targetAndDisplay.slice(splitIndex + 1),
  ];
}

export function LinkPlugin(markDownIt, options: any) {
  markDownIt.inline.ruler.after("escape", "custom_link", linkFetch);
}
// https://github.com/markdown-it/markdown-it/issues/289
// https://meta.discourse.org/t/developers-guide-to-markdown-extensions/66023
