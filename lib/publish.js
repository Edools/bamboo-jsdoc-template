import fs from 'fs';
import helper from 'jsdoc/util/templateHelper';
import {mkdirsSync, copySync} from 'fs-extra';
import {map, forEach, keys, reduce} from 'ramda';
import marked from 'marked';
import staticFiles from './config/static';
import compiler from './templates/compiler';

let { opts, conf } = env;
let { destination } = opts;

export default function publish (data, options, {_tutorials}) {
  prepareDestination();
  copyStaticFiles(staticFiles);

  data = helper.prune(data);
  data().each(doclet => {
    if(doclet.augments) {
      let inheritsFrom = map(longname => data().filter({longname}).first(), doclet.augments);
      doclet.params = doclet.params || [];
      doclet.params = reduce((acc, doclet) => acc.concat(doclet.params), doclet.params, inheritsFrom);
    }
  });

  let apps = getApps(data);
  let globalCtx = getGlobalCtx(apps);

  renderIndex(globalCtx)
  renderApps(globalCtx);
  renderTutorials(_tutorials, globalCtx);
}

function renderIndex(ctx) {
  renderTemplate('index.html', 'index.html', ctx);
}

function getGlobalCtx(apps) {
  let {templates} = conf,
      ctx = {apps, conf};

  if(templates.tutorials && templates.tutorials.metadata) {
    let metadata = JSON.parse(fs.readFileSync(templates.tutorials.metadata, {encoding: 'utf8'}));
    ctx = {...ctx, metadata};
  }

  return ctx;
}

function renderTutorials (tutorials, globalCtx) {
  forEach(tutorial => {
    tutorial.html = marked(tutorial.content);
    renderTemplate('tutorial.html', `tutorials/${tutorial.name}.html`, {tutorial, ...globalCtx});
  }, toArray(tutorials));
}

function toArray (tutorials) {
  return map(key => tutorials[key], keys(tutorials));
}

function renderApps (globalCtx) {
  let {apps} = globalCtx;
  forEach(app => renderTemplate('app.html', `apps/${app.name}.html`, {...globalCtx, app}), apps);
}

function renderTemplate (template, path, ctx) {
  let html = compiler.render(template, ctx);
  fs.writeFileSync(`${destination}/${path}`, html, 'utf8');
}

function getApps (data) {
  let apps = data().filter({ doctype: 'app' });
  return map(app => getTemplatesAndComponents(app, data), apps.get());
}

function getTemplatesAndComponents (app, data) {
  let filter = { app: app.name };
  app.templates = getTemplates(app, data);
  app.components = getComponents(app, data);

  return app;
}

function getTemplates ({name}, data) {
  return data()
    .filter({ app: name, doctype: 'template' })
    .map(doclet => getParamsModels(doclet, data));
}

function getParamsModels (doclet, data) {
  let multiTypeRegex = /^([\w]*).[<]([\w]*)[>]$/;

  doclet.params = doclet.params || [];
  doclet.params = map(param => {
    let type = param.type.names[0],
      modelName = type;

    if(type.indexOf('<') !== -1) {
      modelName = multiTypeRegex.exec(type)[2];
      param.type.names[0] = multiTypeRegex.exec(type)[1];
    }

    let model = data()
      .filter({ doctype: 'model', name: modelName })
      .first();

    if(model) {
      param.properties = param.properties || [];
      param.properties = param.properties.concat(model.properties);
    }

    return param;
  }, doclet.params);

  return doclet;
}

function getComponents ({name}, data) {
  return data()
    .filter({ app: name, doctype: 'component' })
    .get();
}

function prepareDestination () {
  mkdirsSync(destination);
  mkdirsSync(`${destination}/apps`);
  mkdirsSync(`${destination}/static`);
  mkdirsSync(`${destination}/static/scripts`);
  mkdirsSync(`${destination}/static/styles`);
  mkdirsSync(`${destination}/tutorials`);
}

function copyStaticFiles (files) {
  forEach(file => copySync(
    `${__dirname}/../${file.from}`,
    `${destination}/${file.to}`
  ), files);
}
