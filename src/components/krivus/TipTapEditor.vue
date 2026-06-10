<template>
  <div class="tiptap-wrapper">
    <div class="tiptap-toolbar" v-if="!readonly">
      <q-btn-group flat>
        <q-btn flat dense icon="format_bold" size="sm" :color="editor?.isActive('bold') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleBold().run()" />
        <q-btn flat dense icon="format_italic" size="sm" :color="editor?.isActive('italic') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleItalic().run()" />
        <q-btn flat dense icon="format_underlined" size="sm" :color="editor?.isActive('underline') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleStrike().run()" />
      </q-btn-group>

      <q-separator vertical class="q-mx-xs" />

      <q-btn-group flat>
        <q-btn flat dense icon="format_h1" size="sm" :color="editor?.isActive('heading', {level:1}) ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleHeading({level:1}).run()" />
        <q-btn flat dense icon="format_h2" size="sm" :color="editor?.isActive('heading', {level:2}) ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleHeading({level:2}).run()" />
        <q-btn flat dense icon="format_h3" size="sm" :color="editor?.isActive('heading', {level:3}) ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleHeading({level:3}).run()" />
      </q-btn-group>

      <q-separator vertical class="q-mx-xs" />

      <q-btn-group flat>
        <q-btn flat dense icon="format_list_bulleted" size="sm" :color="editor?.isActive('bulletList') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleBulletList().run()" />
        <q-btn flat dense icon="format_list_numbered" size="sm" :color="editor?.isActive('orderedList') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleOrderedList().run()" />
      </q-btn-group>

      <q-separator vertical class="q-mx-xs" />

      <q-btn flat dense icon="format_quote" size="sm" :color="editor?.isActive('blockquote') ? 'primary' : 'grey-7'" @click="editor?.chain().focus().toggleBlockquote().run()" />
      <q-btn flat dense icon="horizontal_rule" size="sm" color="grey-7" @click="editor?.chain().focus().setHorizontalRule().run()" />
    </div>

    <editor-content :editor="editor" class="tiptap-content" :class="{ 'tiptap-readonly': readonly }" />
  </div>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Escreva aqui...' },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  editable: !props.readonly,
  extensions: [
    StarterKit,
    Typography,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getJSON())
  },
})

watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = editor.value.getJSON()
  if (JSON.stringify(current) !== JSON.stringify(val)) {
    editor.value.commands.setContent(val || {}, false)
  }
})

watch(() => props.readonly, (val) => {
  editor.value?.setEditable(!val)
})

onBeforeUnmount(() => editor.value?.destroy())
</script>

<style>
.tiptap-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.tiptap-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-wrap: wrap;
  gap: 2px;
}

.tiptap-content .ProseMirror {
  padding: 16px;
  min-height: 200px;
  outline: none;
  font-size: 14px;
  line-height: 1.7;
  color: #1e293b;
}

.tiptap-content .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; }
.tiptap-content .ProseMirror h2 { font-size: 1.25em; font-weight: 600; margin: 0.8em 0 0.4em; }
.tiptap-content .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.4em; }
.tiptap-content .ProseMirror ul, .tiptap-content .ProseMirror ol { padding-left: 1.5em; }
.tiptap-content .ProseMirror blockquote { border-left: 3px solid #6366f1; margin: 0; padding-left: 12px; color: #64748b; }
.tiptap-content .ProseMirror hr { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
.tiptap-content .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #94a3b8;
  pointer-events: none;
  float: left;
  height: 0;
}
.tiptap-readonly .ProseMirror { background: #f8fafc; cursor: default; }
</style>
