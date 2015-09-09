import {Environment, FileSystemLoader} from 'nunjucks';
import path from 'path';

export default new Environment(
  new FileSystemLoader(path.join(__dirname, '../../template/tmpl'))
);
