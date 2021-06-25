import { Resource } from "sophize-datamodel";

export enum CommentDisplayMode {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
}

export class CommentDisplayOptions {
  mode = CommentDisplayMode.DEFAULT;
  customText: string;
  constructor(displayInput: string) {
    if (!displayInput) return;
    if (
      displayInput.startsWith("'") &&
      displayInput.endsWith("'") &&
      displayInput.length > 2
    ) {
      this.mode = CommentDisplayMode.CUSTOM;
      this.customText = displayInput.slice(1, -1);
      return;
    }

    if (displayInput.toUpperCase() !== CommentDisplayMode.DEFAULT) {
      this.customText = `Unknown option: [${displayInput}]`;
    }
  }
}

export enum PageDisplayMode {
  DEFAULT = "DEFAULT",
  CUSTOM = "CUSTOM",
  REFERENCE = "REFERENCE",
}

export class PageDisplayOptions {
  mode = PageDisplayMode.DEFAULT;
  customText: string;
  constructor(displayInput: string) {
    if (!displayInput) return;

    if (
      displayInput.startsWith("'") &&
      displayInput.endsWith("'") &&
      displayInput.length > 2
    ) {
      this.mode = PageDisplayMode.CUSTOM;
      this.customText = displayInput.slice(1, -1);
      return;
    }

    switch (displayInput.toUpperCase()) {
      case PageDisplayMode.DEFAULT:
        this.mode = PageDisplayMode.DEFAULT;
        return;
      case PageDisplayMode.REFERENCE:
        this.mode = PageDisplayMode.REFERENCE;
        return;
    }
    
    if (displayInput.toUpperCase() !== CommentDisplayMode.DEFAULT) {
      this.customText = `Unknown option: [${displayInput}]`;
    }
  }
}

export enum ResourceDisplayMode {
  NAME = "NAME", // Default.
  CUSTOM = "CUSTOM",
  REFERENCE = "REFERENCE",
  EXPAND = "EXPAND",
}

export enum LinkOption {
  OVERLAY_LINK = "OVERLAY_LINK", // Default.
  NO_LINK = "NO_LINK",
  NAV_LINK = "NAV_LINK",
}

export enum CaseOption {
  DEFAULT_CASE = "DEFAULT_CASE", // Default.
  UPPER_CASE = "UPPER_CASE",
  LOWER_CASE = "LOWER_CASE",
}

const CASE_SHORTCUTS = new Map<string, CaseOption>([
  ["LC", CaseOption.LOWER_CASE],
  ["UC", CaseOption.UPPER_CASE],
]);

export enum OtherDisplayOptions {
  RENDER_INLINE = "RENDER_INLINE", // EXPAND_ONLY
  ARG_TEXT_ONLY = "ARG_TEXT_ONLY", // EXPAND_ONLY, ARG_ONLY
  PLAIN_TEXT = "PLAIN_TEXT", // EXPAND_ONLY
  HIDE_TVI = "HIDE_TVI", // Propositions Only
  HIDE_VALIDITY = "HIDE_VALIDITY", // Arguments Only
  HIDE_ACTIVATED = "HIDE_ACTIVATED", // Machines Only
}

const OPTION_PARTS_SEPARATOR = "|";

export class ResourceDisplayOptions {
  private mode: ResourceDisplayMode;
  private otherOptions: OtherDisplayOptions[] = [];
  linkOption: LinkOption;
  caseOption: CaseOption;
  customText: string;
  error: string;

  constructor(
    displayOptionsString: string,
    parentPlainText?: boolean,
    parentCaseOption?: CaseOption
  ) {
    if (displayOptionsString) {
      displayOptionsString = displayOptionsString.replace(/\\\|/g, "|");
      displayOptionsString
        .split(OPTION_PARTS_SEPARATOR)
        .forEach((option) => this.addPart(option.trim()));
    }
    if (parentPlainText && !this.shouldShowPlainText()) {
      this.otherOptions.push(OtherDisplayOptions.PLAIN_TEXT);
    }
    if (parentCaseOption && parentCaseOption !== CaseOption.DEFAULT_CASE) {
      this.caseOption = parentCaseOption;
    }

    if (this.shouldShowPlainText()) {
      if (this.shouldShowTVI()) {
        this.otherOptions.push(OtherDisplayOptions.HIDE_TVI);
      }
      if (this.shouldShowValidity()) {
        this.otherOptions.push(OtherDisplayOptions.HIDE_VALIDITY);
      }
      if (this.shouldShowActivated()) {
        this.otherOptions.push(OtherDisplayOptions.HIDE_ACTIVATED);
      }
      this.linkOption = LinkOption.NO_LINK;
    }
    ResourceDisplayOptions.fillDefaultsAndCheckError(this);
  }

  public getInputMode() {
    return this.mode;
  }
  
  public getEffectiveMode(resource: Resource) {
    if (!this.mode || (this.mode === ResourceDisplayMode.EXPAND && !resource)) {
      // not REFERENCE, to make sure we see the ellipsis(...) while the resource is getting loaded.
      return ResourceDisplayMode.NAME;
    }
    return this.mode;
  }

  public shouldRenderInline() {
    return this.otherOptions.includes(OtherDisplayOptions.RENDER_INLINE);
  }

  public shouldShowTVI() {
    return !this.otherOptions.includes(OtherDisplayOptions.HIDE_TVI);
  }

  public shouldShowValidity() {
    return !this.otherOptions.includes(OtherDisplayOptions.HIDE_VALIDITY);
  }

  public shouldShowActivated() {
    return !this.otherOptions.includes(OtherDisplayOptions.HIDE_ACTIVATED);
  }

  public shouldShowArgTextOnly() {
    return this.otherOptions.includes(OtherDisplayOptions.ARG_TEXT_ONLY);
  }

  public shouldShowPlainText() {
    return this.otherOptions.includes(OtherDisplayOptions.PLAIN_TEXT);
  }

  private static fillDefaultsAndCheckError(options: ResourceDisplayOptions) {
    if (!options.mode) options.mode = ResourceDisplayMode.NAME;
    if (!options.linkOption) options.linkOption = LinkOption.OVERLAY_LINK;
    if (!options.caseOption) options.caseOption = CaseOption.DEFAULT_CASE;
    if (!options.otherOptions) options.otherOptions = [];
    // TODO: check otherOptions only if mode = expand
    // linkOption only if not expand
    // type specific expand/display options.
    return options;
  }

  private addPart(part: string) {
    if (part.startsWith("'") && part.endsWith("'") && part.length > 2) {
      this.setCustomText(part);
      return;
    }

    const mode = (ResourceDisplayMode as any)[part];
    if (mode) {
      this.setDisplayMode(mode);
      return;
    }
    const linkOption = (LinkOption as any)[part];
    if (linkOption) {
      this.setLinkOption(linkOption);
      return;
    }
    let caseOption = (CaseOption as any)[part];
    if (!caseOption) caseOption = CASE_SHORTCUTS.get(part);
    if (caseOption) {
      this.setCaseOption(caseOption);
      return;
    }
    const expandOption = (OtherDisplayOptions as any)[part];
    if (expandOption) {
      this.addOtherDisplayOption(expandOption);
      return;
    }
    this.error = "Unknown option: " + part;
  }

  private setDisplayMode(mode: ResourceDisplayMode) {
    if (this.mode) {
      this.error = "Mode already set to: " + mode;
    }
    this.mode = mode;
  }

  private setCustomText(customText: string) {
    if (this.mode && this.mode !== ResourceDisplayMode.CUSTOM) {
      this.error = "Cant set custom text with mode: " + this.mode;
      return;
    }

    if (this.customText) {
      this.error = "Custom text already set to: " + customText;
      return;
    }
    this.customText = customText;
    this.mode = ResourceDisplayMode.CUSTOM;
  }

  private setLinkOption(linkOption: LinkOption) {
    if (this.linkOption) {
      this.error = "LinkOption already set to: " + linkOption;
    }
    this.linkOption = linkOption;
  }

  private setCaseOption(caseOption: CaseOption) {
    if (this.caseOption) {
      this.error = "CaseOption already set to: " + caseOption;
    }
    this.caseOption = caseOption;
  }

  private addOtherDisplayOption(option: OtherDisplayOptions) {
    if (this.otherOptions.includes(option)) {
      this.error = "Option already set: " + option;
    }
    this.otherOptions.push(option);
  }
}
