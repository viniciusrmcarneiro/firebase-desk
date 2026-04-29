import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@firebase-desk/ui';
import { ExternalLink, Trash2 } from 'lucide-react';
import { type ReactNode } from 'react';
import { classifyFieldValue, type FieldEditTarget, fieldPathLabel } from './fieldEditModel.ts';

export interface FieldContextMenuProps {
  readonly children: ReactNode;
  readonly document: FirestoreDocumentResult;
  readonly fieldPath: ReadonlyArray<string>;
  readonly onDeleteDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
  readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
  readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
  readonly value: unknown;
}

export interface DocumentContextMenuContentProps {
  readonly document: FirestoreDocumentResult;
  readonly onDeleteDocument?: ((document: FirestoreDocumentResult) => void) | undefined;
  readonly onOpenDocumentInNewTab?: ((documentPath: string) => void) | undefined;
}

export function FieldContextMenu(
  {
    children,
    document,
    fieldPath,
    onDeleteDocument,
    onDeleteField,
    onEditField,
    onOpenDocumentInNewTab,
    onSetFieldNull,
    value,
  }: FieldContextMenuProps,
) {
  if (
    !fieldPath.length
    || (!onEditField && !onDeleteField && !onSetFieldNull && !onDeleteDocument
      && !onOpenDocumentInNewTab)
  ) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className='contents'>{children}</div>
      </ContextMenuTrigger>
      <FieldContextMenuContent
        document={document}
        fieldPath={fieldPath}
        value={value}
        onDeleteDocument={onDeleteDocument}
        onDeleteField={onDeleteField}
        onEditField={onEditField}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
        onSetFieldNull={onSetFieldNull}
      />
    </ContextMenu>
  );
}

export function FieldContextMenuContent(
  {
    document,
    fieldPath,
    onDeleteDocument,
    onDeleteField,
    onEditField,
    onOpenDocumentInNewTab,
    onSetFieldNull,
    value,
  }: Omit<FieldContextMenuProps, 'children'>,
) {
  const classification = classifyFieldValue(value);
  const target: FieldEditTarget = { documentPath: document.path, fieldPath, value };
  const label = fieldPathLabel(fieldPath);
  return (
    <ContextMenuContent>
      <ContextMenuSectionLabel>Field</ContextMenuSectionLabel>
      <FieldContextMenuSection
        classification={classification}
        fieldPathLabel={label}
        target={target}
        value={value}
        onDeleteField={onDeleteField}
        onEditField={onEditField}
        onSetFieldNull={onSetFieldNull}
      />
      {onOpenDocumentInNewTab || onDeleteDocument
        ? (
          <>
            <MenuSeparator />
            <DocumentContextMenuSection
              document={document}
              onDeleteDocument={onDeleteDocument}
              onOpenDocumentInNewTab={onOpenDocumentInNewTab}
            />
          </>
        )
        : null}
    </ContextMenuContent>
  );
}

export function DocumentContextMenuContent(
  { document, onDeleteDocument, onOpenDocumentInNewTab }: DocumentContextMenuContentProps,
) {
  return (
    <ContextMenuContent>
      <DocumentContextMenuSection
        document={document}
        onDeleteDocument={onDeleteDocument}
        onOpenDocumentInNewTab={onOpenDocumentInNewTab}
      />
    </ContextMenuContent>
  );
}

function FieldContextMenuSection(
  {
    classification,
    fieldPathLabel: label,
    onDeleteField,
    onEditField,
    onSetFieldNull,
    target,
    value,
  }: {
    readonly classification: ReturnType<typeof classifyFieldValue>;
    readonly fieldPathLabel: string;
    readonly onDeleteField?: ((target: FieldEditTarget) => void) | undefined;
    readonly onEditField?: ((target: FieldEditTarget, jsonMode: boolean) => void) | undefined;
    readonly onSetFieldNull?: ((target: FieldEditTarget) => void) | undefined;
    readonly target: FieldEditTarget;
    readonly value: unknown;
  },
) {
  return (
    <>
      {onEditField
        ? (
          <ContextMenuItem onSelect={() => onEditField(target, classification.jsonMode)}>
            {classification.editLabel}
          </ContextMenuItem>
        )
        : null}
      {onSetFieldNull
        ? (
          <ContextMenuItem onSelect={() => onSetFieldNull(target)}>
            Set null
          </ContextMenuItem>
        )
        : null}
      {onDeleteField
        ? (
          <ContextMenuItem onSelect={() => onDeleteField(target)}>
            Delete field
          </ContextMenuItem>
        )
        : null}
      <ContextMenuItem onSelect={() => copyText(label)}>
        Copy field path
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => copyText(stringifyValue(value))}>
        Copy value
      </ContextMenuItem>
    </>
  );
}

export function DocumentContextMenuSection(
  { document, onDeleteDocument, onOpenDocumentInNewTab }: DocumentContextMenuContentProps,
) {
  return (
    <>
      <ContextMenuSectionLabel>Document</ContextMenuSectionLabel>
      {onOpenDocumentInNewTab
        ? (
          <ContextMenuItem
            className='gap-2'
            onSelect={() => onOpenDocumentInNewTab(document.path)}
          >
            <ExternalLink size={13} aria-hidden='true' /> Open in new tab
          </ContextMenuItem>
        )
        : null}
      {onDeleteDocument
        ? (
          <ContextMenuItem
            className='gap-2'
            onSelect={() => onDeleteDocument(document)}
          >
            <Trash2 size={13} aria-hidden='true' /> Delete document
          </ContextMenuItem>
        )
        : null}
    </>
  );
}

function ContextMenuSectionLabel({ children }: { readonly children: ReactNode; }) {
  return <div className='px-2 py-1 text-xs font-semibold text-text-muted'>{children}</div>;
}

function MenuSeparator() {
  return <ContextMenuSeparator className='my-1 h-px bg-border-subtle' />;
}

function stringifyValue(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function copyText(value: string) {
  void globalThis.navigator?.clipboard?.writeText(value).catch(() => {});
}
