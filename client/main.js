import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { LoadLibMask, ExecFuncMask } from './regex_masks'
import { Session } from 'meteor/session'

import './main.html';


Template.filters.onRendered(function() {
  this.$('.datetimepicker').datetimepicker({
    locale: 'ru',
    format: 'LT'
  });
});

Template.load_file.onCreated(function() {
});

Template.view.onCreated(function() {
});

Template.load_file.helpers({
  getRowCount: function() {
    return (Session.get('resultParsed') || []).length;
  }
});

Template.view.helpers({
  settings: function() {
    return {
      collection: Session.get('resultParsed') || [],
      rowsPerPage: 20,
      showFilter: false,
      fields: [
        { key: 'date', label: 'Дата'},
        { key: 'type', label: 'Тип'},
        { key: 'method', label: 'Метод'},
        { key: 'message', label: 'Сообщение'},
      ]
    }
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
      _parseFile(event.target.result);
    };
    reader.readAsText(files[0]);

  }
});

Template.filters.events({
  'click #start_filter'() {
    _prepareData();
  }
});

Template.view.events({
  'mouseup .reactive-table tbody tr td': function(e) {
    if (e.button === 2)
      switch (e.target.className) {
        case 'method':
          _show_menu('#context-menu', e.target, function(context) {
            $('#filter_method').val(context.text());
            _prepareData();
          });
          break;
        case 'date':
          _show_menu('#context-menu-datetime', e.target, function(context, e) {
            $('#' + ($(e.target).hasClass('from') ? 'fromdatetime' : 'todatetime')).data("DateTimePicker").date(context.text());
            _prepareData()
          });
          break;
      }
  }
});

function _show_menu(menu, target, callback) {
  $(menu).removeClass('open');
  $(target).contextmenu({
    target: menu,
    onItem: function(context, e) {
      callback(context, e);
    }
  })
}

function _parseFile(fileData) {
  //document.getElementById('file_data').innerText = fileData;

  let rows = fileData.split('\n');
  let result = [];
  for (let i = 0; i < rows.length; i++) {
    let row = _parseFunc(rows[i]) || _parseLib(rows[i]);

    if (!row)
      continue;

    result.push(row);
  }
  Session.set('allData', result);
  _prepareData();
}

function _prepareData() {
  let data = Session.get('allData') || [];
  let result = [];
  let onlyFuncValue = $('#filter_only_method').prop("checked");
  let funcFilterValue = $('#filter_method').val().toLowerCase();
  let fromdt = $('#fromdatetime').data("DateTimePicker").date();
  let todt = $('#todatetime').data("DateTimePicker").date();
  data.forEach(function(item) {
    // Отфильтруем по типу
    switch ($('#filter_type').val()) {
      case 'all':
        break;
      case 'warn':
        if (item.type !== 'WARNING')
          return;
        break;
      case 'err':
        if (item.type !== 'ERROR')
          return;
        break;
      case 'warnerr':
        if (item.type !== 'ERROR' || item.type !== 'WARNING')
          return;
        break;
    }

    // Отфильтровать, что есть название
    if (onlyFuncValue && !item.method)
      return;

    // Отфильтруем по названию функциюю
    if (funcFilterValue && (item.method || '').toLowerCase().indexOf(funcFilterValue) === -1)
      return;

    // Отфильтруем по времени
    if (fromdt && (item.date || '') < ((fromdt.hour() < 10 ? '0' + fromdt.hour() : fromdt.hour()) + ':' + (fromdt.minute() < 10 ? '0' + fromdt.minute() : fromdt.minute()) + ':00.000'))
      return;

    if (todt && (item.date || '') > ((todt.hour() < 10 ? '0' + todt.hour() : todt.hour()) + ':' + (todt.minute() < 10 ? '0' + todt.minute() : todt.minute()) + ':59.999'))
      return;

    // Добавил в выборку значение, которое прошло все фильтры
    result.push(item);
  });
  Session.set('resultParsed', result);
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
    parse: 'LoadLibMask',
    class_type: row[5] === 'WARNING' ? 'warning' : row[5] === 'ERROR' ? 'error' : 'info'
  }
}