import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { LoadLibMask, ExecFuncMask } from './regex_masks'

import './main.html';

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
    let rows = Template.instance().fileInfo.get('resultParsed');
    if (!rows)
      return null;
    let type = Template.instance().filter.get('Type');
    let method = Template.instance().filter.get('Method');
    let result = rows;
    result = result.filter(function(item) {
      let isFilter = true;
      if (isFilter && type !== 'all') {
        if (type === 'err')
          isFilter = item.type === 'ERROR';
        if (type === 'warn')
          isFilter = item.type === 'WARNING';
        if (type === 'warnerr')
          isFilter = item.type === 'ERROR' || item.type === 'WARNING';
      }
      if (isFilter && method) {
        isFilter = item.method === method;
      }
      return isFilter;
    });
    return result.slice(0, rowsCount);
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
  let lastRow = null;
  for (let i = 0; i < rows.length; i++) {
    let row = _parseFunc(rows[i]) || _parseLib(rows[i]);

    if (!row)
      continue;

    // Если у нас есть прошлая строка, то ее можнт надо дополнить
    if (lastRow) {
      // Если у нас прошлая строка совпадает по идентификатору процессов и типу то клонируем
      if (lastRow.p1 === row.p1 && lastRow.p2 === row.p2 && lastRow.type === row.type && lastRow.method === row.method) {
          lastRow.data.push({
            date: row.data[0].date,
            message: row.data[0].message
          });
        continue;
      }

      // Если прошлую строку дополнять не надо, то ее надо запушить
      result.push(lastRow);
    }
    lastRow = row;
  }
  template.fileInfo.set('resultParsed', result);
}

function _parseFunc(str) {
  let row = ExecFuncMask.exec(str);
  if (!row)
    return null;
  return {
    data: [{
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
      message: row[12]
    }],
    parse: 'ExecFuncMask',
    p1: row[2],
    p2: row[3],
    method: row[8],
    type: row[5],
    class_type: row[5] === 'WARNING' ? 'warning' : row[5] === 'ERROR' ? 'error' : 'info'
  }
}

function _parseLib(str) {
  let row = LoadLibMask.exec(str);
  if (!row)
    return null;
  return {
    data: [{
      date: row[1],
      p1: row[2],
      p2: row[3],
      process: row[4],
      type: row[5],
      message: row[6]
    }],
    parse: 'ExecFuncMask',
    p1: row[2],
    p2: row[3],
    type: row[5],
    class_type: row[5] === 'WARNING' ? 'warning' : row[5] === 'ERROR' ? 'error' : 'info'
  }
}