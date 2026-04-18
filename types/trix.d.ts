declare module "trix" {
  const Trix: TrixNamespace;
  export default Trix;
}

interface TrixAttachmentInit {
  content?: string;
  contentType?: string;
}

declare class TrixAttachment {
  constructor(attributes: TrixAttachmentInit);
}

interface TrixNamespace {
  Attachment: typeof TrixAttachment;
}

declare global {
  interface Window {
    Trix: TrixNamespace;
  }
}
