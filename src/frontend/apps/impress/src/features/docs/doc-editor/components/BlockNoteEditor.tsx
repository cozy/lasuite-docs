import { codeBlock } from '@blocknote/code-block';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  // filterSuggestionItems,
  withPageBreak,
} from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import * as locales from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import {
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  createReactInlineContentSpec,
  useCreateBlockNote,
} from '@blocknote/react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Y from 'yjs';

import IconAudio from '@/assets/icons/file-type-audio.svg';
import IconCode from '@/assets/icons/file-type-code.svg';
import IconFile from '@/assets/icons/file-type-files.svg';
import IconImage from '@/assets/icons/file-type-image.svg';
import IconNote from '@/assets/icons/file-type-note.svg';
import IconPdf from '@/assets/icons/file-type-pdf.svg';
import IconSheet from '@/assets/icons/file-type-sheet.svg';
import IconSlide from '@/assets/icons/file-type-slide.svg';
import IconText from '@/assets/icons/file-type-text.svg';
import { Box, TextErrors } from '@/components';
import { Doc, useIsCollaborativeEditable } from '@/docs/doc-management';
import { useAuth } from '@/features/auth';

import { useHeadings, useUploadFile, useUploadStatus } from '../hook/';
import useSaveDoc from '../hook/useSaveDoc';
import { useEditorStore } from '../stores';
import { cssEditor } from '../styles';
import { DocsBlockNoteEditor } from '../types';
import { randomColor } from '../utils';

import { BlockNoteSuggestionMenu } from './BlockNoteSuggestionMenu';
import { BlockNoteToolbar } from './BlockNoteToolBar/BlockNoteToolbar';
import { CalloutBlock, DividerBlock } from './custom-blocks';

// The Mention inline content.
export const FileMention = createReactInlineContentSpec(
  {
    type: 'fileMention',
    propSchema: {
      filename: {
        default: 'Unknown',
      },
      url: {
        default: 'blank',
      },
      mimetype: {
        default: 'application/octet-stream',
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      console.log(props);
      return (
        <a
          style={{
            paddingRight: '4px',
            paddingLeft: '4px',
          }}
          href={props.inlineContent.props.url}
          target="_blank"
        >
          {getIconForMimeType(props.inlineContent.props.mimetype)}{' '}
          {props.inlineContent.props.filename}
        </a>
      );
    },
  },
);

// Function to get appropriate icon based on MIME type
const getIconForMimeType = (mimeType: string) => {
  if (!mimeType) {
    return <IconFile />;
  }

  const [type, subtype] = mimeType.split('/');

  switch (type) {
    case 'application': {
      if (subtype === 'pdf') {
        return <IconPdf />;
      }
      if (subtype.includes('spreadsheet')) {
        return <IconSheet />;
      } 
      if (subtype.includes('presentation')) {
        return <IconSlide />;
      }
      if (subtype.includes('xml') || subtype.includes('json')) {
        return <IconCode />;
      }
      break;
    }
    case 'image':
      return <IconImage />;
    case 'audio':
      return <IconAudio />;
    case 'text':
      if (subtype == 'vnd.cozy.note+markdown') {
        return <IconNote />;
      }
      return <IconText />;
    case 'sheet':
      return <IconSheet />;
    case 'slide':
      return <IconSlide />;
    default:
      return <IconFile />;
  }

  return <IconFile />;
};

interface FileSearchResult {
  doc: object | null;
  slug: string | null;
  title: string | null;
  subTitle: string | null;
  url: string | null;
  secondaryUrl: string | null;
}

export const blockNoteSchema = withPageBreak(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: CalloutBlock,
      divider: DividerBlock,
    },
    inlineContentSpecs: {
      // Adds all default inline content.
      ...defaultInlineContentSpecs,
      // Adds the mention tag.
      fileMention: FileMention,
    },
  }),
);

interface BlockNoteEditorProps {
  doc: Doc;
  provider: HocuspocusProvider;
}

// Function which gets all users for the mentions menu.
const getFileMentionMenuItems = async (
  editor: typeof blockNoteSchema.BlockNoteEditor,
  query: string,
): Promise<DefaultReactSuggestionItem[]> => {
  const files = (await window._cozyBridge.search(
    query.substring(1),
  )) as FileSearchResult[];

  return files.map((file) => ({
    title: file.title || '',
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: 'fileMention',
          props: {
            filename: file?.title || '',
            url: file?.url || '',
            mimetype: file?.doc?.mime || '',
          },
        },
        ' ', // add a space after the mention
      ]);
    },
  }));
};

export const BlockNoteEditor = ({ doc, provider }: BlockNoteEditorProps) => {
  const { user } = useAuth();
  const { setEditor } = useEditorStore();
  const { t } = useTranslation();

  const { isEditable, isLoading } = useIsCollaborativeEditable(doc);
  const readOnly = !doc.abilities.partial_update || !isEditable || isLoading;

  useSaveDoc(doc.id, provider.document, !readOnly);
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const { uploadFile, errorAttachment } = useUploadFile(doc.id);

  const collabName = readOnly
    ? 'Reader'
    : user?.full_name || user?.email || t('Anonymous');
  const showCursorLabels: 'always' | 'activity' | (string & {}) = 'activity';

  const editor: DocsBlockNoteEditor = useCreateBlockNote(
    {
      codeBlock,
      collaboration: {
        provider,
        fragment: provider.document.getXmlFragment('document-store'),
        user: {
          name: collabName,
          color: randomColor(),
        },
        /**
         * We render the cursor with a custom element to:
         * - fix rendering issue with the default cursor
         * - hide the cursor when anonymous users
         */
        renderCursor: (user: { color: string; name: string }) => {
          const cursorElement = document.createElement('span');

          if (user.name === 'Reader') {
            return cursorElement;
          }

          cursorElement.classList.add('collaboration-cursor-custom__base');
          const caretElement = document.createElement('span');
          caretElement.classList.add('collaboration-cursor-custom__caret');
          caretElement.setAttribute('spellcheck', `false`);
          caretElement.setAttribute('style', `background-color: ${user.color}`);

          if (showCursorLabels === 'always') {
            cursorElement.setAttribute('data-active', '');
          }

          const labelElement = document.createElement('span');

          labelElement.classList.add('collaboration-cursor-custom__label');
          labelElement.setAttribute('spellcheck', `false`);
          labelElement.setAttribute(
            'style',
            `background-color: ${user.color};border: 1px solid ${user.color};`,
          );
          labelElement.insertBefore(document.createTextNode(user.name), null);

          caretElement.insertBefore(labelElement, null);

          cursorElement.insertBefore(document.createTextNode('\u2060'), null); // Non-breaking space
          cursorElement.insertBefore(caretElement, null);
          cursorElement.insertBefore(document.createTextNode('\u2060'), null); // Non-breaking space

          return cursorElement;
        },
        showCursorLabels: showCursorLabels as 'always' | 'activity',
      },
      dictionary: locales[lang as keyof typeof locales],
      tables: {
        splitCells: true,
        cellBackgroundColor: true,
        cellTextColor: true,
        headers: true,
      },
      uploadFile,
      schema: blockNoteSchema,
    },
    [collabName, lang, provider, uploadFile],
  );

  useHeadings(editor);
  useUploadStatus(editor);

  useEffect(() => {
    setEditor(editor);

    return () => {
      setEditor(undefined);
    };
  }, [setEditor, editor]);

  return (
    <Box
      $padding={{ top: 'md' }}
      $background="white"
      $css={cssEditor(readOnly)}
      className="--docs--editor-container"
    >
      {errorAttachment && (
        <Box $margin={{ bottom: 'big', top: 'none', horizontal: 'large' }}>
          <TextErrors
            causes={errorAttachment.cause}
            canClose
            $textAlign="left"
          />
        </Box>
      )}

      <BlockNoteView
        editor={editor}
        formattingToolbar={false}
        slashMenu={false}
        editable={!readOnly}
        theme="light"
      >
        <BlockNoteSuggestionMenu />
        <BlockNoteToolbar />
        {/* Adds a mentions menu which opens with the "@" key */}
        <SuggestionMenuController
          triggerCharacter="+"
          getItems={async (query) => {
            // Gets the mentions menu items
            return await getFileMentionMenuItems(editor, query);
          }}
        />
      </BlockNoteView>
    </Box>
  );
};

interface BlockNoteEditorVersionProps {
  initialContent: Y.XmlFragment;
}

export const BlockNoteEditorVersion = ({
  initialContent,
}: BlockNoteEditorVersionProps) => {
  const readOnly = true;
  const { setEditor } = useEditorStore();
  const editor = useCreateBlockNote(
    {
      collaboration: {
        fragment: initialContent,
        user: {
          name: '',
          color: '',
        },
        provider: undefined,
      },
      schema: blockNoteSchema,
    },
    [initialContent],
  );
  useHeadings(editor);

  useEffect(() => {
    setEditor(editor);

    return () => {
      setEditor(undefined);
    };
  }, [setEditor, editor]);

  return (
    <Box $css={cssEditor(readOnly)} className="--docs--editor-container">
      <BlockNoteView editor={editor} editable={!readOnly} theme="light" />
    </Box>
  );
};
