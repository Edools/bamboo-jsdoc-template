export default function defineSimpleTag (tagName) {
  return {
    onTagged: (doclet, tag) => {
      doclet[tagName] = tag.value;
    }
  };
}
