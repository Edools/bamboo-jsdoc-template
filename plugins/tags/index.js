import defineSimpleTag from './simple';

export default function (dictionary) {
  dictionary.defineTag('doctype', defineSimpleTag('doctype'));
  dictionary.defineTag('app', defineSimpleTag('app'));
}
