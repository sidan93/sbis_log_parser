import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { LoadLibMask, ExecFuncMask } from './regex_masks'

import './main.html';

Template.load_file.onRendered(function() {
  this.$('.datetimepicker').datetimepicker({
    locale: 'ru',
    format: 'LT'
  });
});

Template.load_file.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.fileInfo = new ReactiveDict('FileInfo');
  this.filter = new ReactiveDict('Filter');
});

Template.load_file.helpers({
  getRowCount: function() {
    return Template.instance().fileInfo.get('rowCount');
  },
  getRow: function(rowsCount) {
    rowsCount = 1000;
    let rows = Template.instance().fileInfo.get('resultParsed');
    if (!rows)
      return null;
    return rows;
  },
  fields: function() {
    return [
      { key: 'date', label: 'Дата'},
      { key: 'type', label: 'Тип'},
      { key: 'method', label: 'Метод'},
      { key: 'message', label: 'Сообщение'},
    ];
  }
});

Template.load_file.events({
  'change #select_file'(event, instance) {
    let files = event.target.files; // FileList object

    // Если не выбрали файлов, то выходим
    if (!files.length)
      return;

    let reader = new FileReader();
    reader.onload = function(event) {
      showFile(instance, event.target.result);
    };
    reader.readAsText(files[0]);

  },
  'change #filter_type'(event, instance) {
    Template.instance().filter.set('Type', event.target.value)
  },
  'change #filter_method'(event, instance) {
    Template.instance().filter.set('Method', event.target.value)
  }
});

function showFile(template, fileData) {
  //document.getElementById('file_data').innerText = fileData;

  let rows = fileData.split('\n');
  template.fileInfo.set('rows', rows);
  template.fileInfo.set('rowCount', rows.length);
  let result = [];
  for (let i = 0; i < rows.length; i++) {
    let row = _parseFunc(rows[i]) || _parseLib(rows[i]);

    if (!row)
      continue;

    result.push(row);
  }
  template.fileInfo.set('resultParsed', result);
}

function _parseFunc(str) {
  let row = ExecFuncMask.exec(str);
  if (!row)
    return null;
  return {
    date: row[1],
    p1: row[2],
    p2: row[3],
    process: row[4],
    type: row[5],
    ip1: row[6],
    ip2: row[7],
    method: row[8],
    sid: row[9],
    p3: row[10],
    p4: row[11],
    message: row[12],
    parse: 'ExecFuncMask',
    class_type: row[5] === 'WARNING' ? 'warning' : row[5] === 'ERROR' ? 'error' : 'info'
  }
}

function _parseLib(str) {
  let row = LoadLibMask.exec(str);
  if (!row)
    return null;
  return {
    date: row[1],
    p1: row[2],
    p2: row[3],
    process: row[4],
    type: row[5],
    message: row[6],
    parse: 'ExecFuncMask',
    class_type: row[5] === 'WARNING' ? 'warning' : row[5] === 'ERROR' ? 'error' : 'info'
  }
}