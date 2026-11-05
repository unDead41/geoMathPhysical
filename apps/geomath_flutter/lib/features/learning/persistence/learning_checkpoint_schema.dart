import 'dart:convert';
import 'dart:math' as math;

/// Storage validation for worker 1's private checkpoint schema, not a math port.
/// Canonical geometry/parser checks still run in the child before restoration.
abstract final class LearningCheckpointSchema {
  static const version = 1;
  static const sourceCommit = '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5';
  static const moduleVersion = '1.6.2';
  static const maximumBytes = 2 * 1024 * 1024;
  static const maximumDepth = 24;
  static const maximumNodes = 400000;
  static const models = {
    'cube',
    'cuboid',
    'pyramid',
    'cylinder',
    'cone',
    'triangular-prism',
    'tetrahedron',
    'pentagonal-prism',
    'hexagonal-prism',
    'sphere',
    'hemisphere',
  };
  static const sections = {
    'explore',
    'views',
    'notes',
    'calculator',
    'net',
    'volume',
    'area',
    'composite',
    'projection',
    'calculation',
  };
  static const _activities = {'net', 'volume', 'area', 'composite'};
  static const _projectionViews = {'front', 'side', 'plan'};
  static const _steps = {'formula', 'substitution', 'calculation', 'unit'};
  static const _lineTypes = {'visible', 'hidden', 'construction'};
  static const _piModes = {'22/7', '3.142', 'full'};
  static const _forbiddenKeys = {
    '__proto__',
    'prototype',
    'constructor',
    'owner',
    'actor',
    'access_token',
    'refresh_token',
    'jwt',
    'bridgesession',
    'progresssession',
    'password',
    'credential',
    'credentials',
    'service_role',
    'client_secret',
    'token',
  };
  static final _control = RegExp(r'[\u0000-\u0008\u000b\u000c\u000e-\u001f]');
  static final _keyPattern = RegExp(r'^[a-zA-Z][a-zA-Z0-9_-]{0,63}$');
  static final _jwt = RegExp(
    r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
  );

  static bool isValid(Object? value) {
    try {
      if (!_safe(value) ||
          !_exact(value, {
            'schemaVersion',
            'sourceCommit',
            'moduleVersion',
            'section',
            'explore',
            'notes',
            'labs',
            'projection',
            'calculation',
          })) {
        return false;
      }
      final v = value! as Map<String, Object?>;
      if (v['schemaVersion'] != version ||
          v['sourceCommit'] != sourceCommit ||
          v['moduleVersion'] != moduleVersion ||
          !sections.contains(v['section']) ||
          !_explore(v['explore'])) {
        return false;
      }
      if (v['notes'] != null && !_notes(v['notes'])) {
        return false;
      }
      if (v['labs'] != null && !_labs(v['labs'])) {
        return false;
      }
      if (v['projection'] != null && !_projection(v['projection'])) {
        return false;
      }
      if (v['calculation'] != null && !_calculation(v['calculation'])) {
        return false;
      }
      return utf8.encode(jsonEncode(v)).length <= maximumBytes;
    } catch (_) {
      return false;
    }
  }

  /// Reject pathological nesting before handing untrusted stored text to JSON.
  static bool permitsEncoded(String encoded) {
    if (utf8.encode(encoded).length > maximumBytes) {
      return false;
    }
    var depth = 0;
    var inString = false;
    var escaped = false;
    for (final code in encoded.codeUnits) {
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (code == 92) {
          escaped = true;
        } else if (code == 34) {
          inString = false;
        }
      } else if (code == 34) {
        inString = true;
      } else if (code == 91 || code == 123) {
        if (++depth > maximumDepth + 1) {
          return false;
        }
      } else if (code == 93 || code == 125) {
        if (--depth < 0) {
          return false;
        }
      }
    }
    return !inString && depth == 0;
  }

  static bool _safe(Object? value) {
    var nodes = 0;
    bool visit(Object? node, int depth) {
      if (++nodes > maximumNodes || depth > maximumDepth) {
        return false;
      }
      if (node == null || node is bool) {
        return true;
      }
      if (node is num) {
        return _number(node);
      }
      if (node is String) {
        return _text(node) && !_jwt.hasMatch(node);
      }
      if (node is List) {
        return node.length <= 200 && node.every((v) => visit(v, depth + 1));
      }
      if (node is! Map<String, Object?> || node.length > 64) {
        return false;
      }
      return node.entries.every(
        (entry) =>
            _keyPattern.hasMatch(entry.key) &&
            !_forbiddenKeys.contains(entry.key.toLowerCase()) &&
            visit(entry.value, depth + 1),
      );
    }

    return visit(value, 0);
  }

  static bool _exact(Object? v, Set<String> keys) =>
      v is Map<String, Object?> &&
      v.length == keys.length &&
      keys.every(v.containsKey);
  static bool _allowed(Object? v, Set<String> keys) =>
      v is Map<String, Object?> && v.keys.every(keys.contains);
  static bool _number(Object? v, [double min = -1e6, double max = 1e6]) =>
      v is num && v.isFinite && v >= min && v <= max;
  static bool _integer(Object? v, int min, int max) =>
      _number(v, min.toDouble(), max.toDouble()) &&
      (v! as num) == (v as num).truncateToDouble();
  static bool _text(Object? v, [int max = 600]) =>
      v is String && v.length <= max && !_control.hasMatch(v);
  static bool _list(
    Object? v,
    bool Function(Object?) validate, [
    int max = 200,
  ]) => v is List && v.length <= max && v.every(validate);
  static bool _dimensions(Object? v, {bool raw = false}) =>
      v is Map<String, Object?> &&
      v.length <= 8 &&
      v.entries.every(
        (e) =>
            const {'a', 'p', 'l', 't', 'j', 'u', 'v', 'c'}.contains(e.key) &&
            (raw ? _text(e.value, 80) : _number(e.value, .000001, 1000)),
      );
  static bool _projectionDimensions(Object? shape, Object? value) {
    final fields = switch (shape) {
      'cube' || 'assembly-step' || 'assembly-recess' => {'a'},
      'cuboid' => {'p', 'l', 't'},
      'pyramid' => {'a', 't'},
      'cylinder' || 'cone' => {'j', 't'},
      _ => null,
    };
    if (fields == null || !_exact(value, fields)) {
      return false;
    }
    final dimensions = value! as Map<String, Object?>;
    return dimensions.values.every((v) => _integer(v, 1, 20)) &&
        (!(shape! as String).startsWith('assembly-') || dimensions['a'] == 1);
  }

  static bool _camera(Object? value) {
    if (!_exact(value, {'yaw', 'pitch', 'zoom'})) {
      return false;
    }
    final v = value! as Map;
    return _number(v['yaw'], -100000, 100000) &&
        _number(v['pitch'], -math.pi / 2, math.pi / 2) &&
        _number(v['zoom'], .4, 3);
  }

  static bool _pair(Object? v, [double min = -100, double max = 100]) =>
      v is List && v.length == 2 && v.every((n) => _number(n, min, max));

  static bool _explore(Object? value) {
    if (!_exact(value, {
      'shape',
      'progress',
      'yaw',
      'pitch',
      'zoom',
      'mode',
      'view',
      'labels',
      'selected',
      'auto',
      'direction',
      'kind',
      'hold',
      'manualOrbit',
      'pausedAnimation',
      'speed',
    })) {
      return false;
    }
    final e = value! as Map<String, Object?>;
    final pause = e['pausedAnimation'];
    return models.contains(e['shape']) &&
        _number(e['progress'], 0, 1) &&
        _camera({'yaw': e['yaw'], 'pitch': e['pitch'], 'zoom': e['zoom']}) &&
        const {'model', 'views'}.contains(e['mode']) &&
        const {
          'front',
          'back',
          'left',
          'right',
          'top',
          'bottom',
        }.contains(e['view']) &&
        e['labels'] is bool &&
        (e['selected'] == null || _integer(e['selected'], 0, 20)) &&
        e['auto'] is bool &&
        const {-1, 1}.contains(e['direction']) &&
        const {'cycle', 'target', 'view-close'}.contains(e['kind']) &&
        _number(e['hold'], 0, 10000) &&
        e['manualOrbit'] is bool &&
        const [.5, 1].contains(e['speed']) &&
        (pause == null ||
            _exact(pause, {'direction', 'kind', 'hold'}) &&
                const {-1, 1}.contains((pause as Map)['direction']) &&
                const {
                  'cycle',
                  'target',
                  'view-close',
                }.contains(pause['kind']) &&
                _number(pause['hold'], 0, 10000));
  }

  static bool _notes(Object? value) {
    if (!_exact(value, {'shape', 'piMode', 'dimensions'})) {
      return false;
    }
    final v = value! as Map;
    return models.contains(v['shape']) &&
        _piModes.contains(v['piMode']) &&
        _dimensions(v['dimensions'], raw: true);
  }

  static bool _primitive(Object? value) {
    if (value is! Map<String, Object?> || !_lineTypes.contains(value['type'])) {
      return false;
    }
    if (value['kind'] == 'circle') {
      return _exact(value, {'kind', 'center', 'r', 'type'}) &&
          _pair(value['center'], 0, 100) &&
          _number(value['r'], .000001, 100);
    }
    if (value['kind'] != 'line' ||
        !_exact(value, {'kind', 'a', 'b', 'type'}) ||
        !_pair(value['a'], 0, 100) ||
        !_pair(value['b'], 0, 100)) {
      return false;
    }
    final a = value['a']! as List;
    final b = value['b']! as List;
    final dx = (a[0] as num) - (b[0] as num);
    final dy = (a[1] as num) - (b[1] as num);
    return math.sqrt(dx * dx + dy * dy) > 1e-8;
  }

  static bool _drawings(Object? v) => _list(v, _primitive);

  static bool _projection(Object? value) {
    if (!_exact(value, {
      'state',
      'camera',
      'measurementDraft',
      'coordinateDraft',
    })) {
      return false;
    }
    final p = value! as Map<String, Object?>;
    final state = p['state'];
    if (!_camera(p['camera']) ||
        !_dimensions(p['measurementDraft'], raw: true) ||
        !_exact(p['coordinateDraft'], {'x1', 'y1', 'x2', 'y2', 'radius'}) ||
        !(p['coordinateDraft']! as Map).values.every((v) => _text(v, 80)) ||
        !_exact(state, {
          'shape',
          'scale',
          'dimensions',
          'mode',
          'guideStep',
          'activeView',
          'tool',
          'lineType',
          'drawings',
          'history',
          'hints',
          'selected',
          'pending',
          'cursor',
          'showGuides',
        })) {
      return false;
    }
    final s = state! as Map<String, Object?>;
    if (!const {
          'cube',
          'cuboid',
          'pyramid',
          'cylinder',
          'cone',
          'assembly-step',
          'assembly-recess',
        }.contains(s['shape']) ||
        !const {1, 2}.contains(s['scale']) ||
        !_projectionDimensions(s['shape'], s['dimensions']) ||
        !const {'guide', 'exercise'}.contains(s['mode']) ||
        !_integer(s['guideStep'], 0, 3) ||
        !_projectionViews.contains(s['activeView']) ||
        !const {'line', 'circle', 'select'}.contains(s['tool']) ||
        !_lineTypes.contains(s['lineType']) ||
        !_pair(s['cursor'], 0, 100) ||
        s['showGuides'] is! bool ||
        !const [
          'drawings',
          'history',
          'hints',
        ].every((key) => _exact(s[key], _projectionViews))) {
      return false;
    }
    final drawings = s['drawings']! as Map;
    final history = s['history']! as Map;
    final hints = s['hints']! as Map;
    if (!_projectionViews.every(
      (key) =>
          _drawings(drawings[key]) &&
          _list(history[key], _drawings, 30) &&
          hints[key] is bool,
    )) {
      return false;
    }
    final selected = s['selected'];
    if (selected != null &&
        (!_exact(selected, {'view', 'index'}) ||
            !_projectionViews.contains((selected as Map)['view']) ||
            !_integer(
              selected['index'],
              0,
              (drawings[selected['view']] as List).length - 1,
            ))) {
      return false;
    }
    final pending = s['pending'];
    return pending == null ||
        _exact(pending, {'view', 'point'}) &&
            _projectionViews.contains((pending as Map)['view']) &&
            _pair(pending['point'], 0, 100);
  }

  static bool _calculation(Object? value) {
    if (!_exact(value, {'draft', 'activeStep', 'problemIndex'})) {
      return false;
    }
    final c = value! as Map<String, Object?>;
    if (!_integer(c['activeStep'], 0, 3) ||
        !_integer(c['problemIndex'], 0, 1000000) ||
        !_exact(c['draft'], {
          'shape',
          'quantity',
          'context',
          'given',
          'piMode',
          'targetUnit',
          'dimensions',
          'answers',
          'hints',
          'revealed',
          'example',
        })) {
      return false;
    }
    final d = c['draft']! as Map<String, Object?>;
    return models.contains(d['shape']) &&
        const {'surface', 'volume'}.contains(d['quantity']) &&
        const {
          'closed',
          'open',
          'cube-pyramid',
          'cylinder-cone',
        }.contains(d['context']) &&
        const {'radius', 'diameter'}.contains(d['given']) &&
        _piModes.contains(d['piMode']) &&
        _text(d['targetUnit'], 12) &&
        _dimensions(d['dimensions'], raw: true) &&
        _exact(d['answers'], {
          'formula',
          'substitution',
          'calculation',
          'unit',
          'unitValue',
        }) &&
        (d['answers']! as Map).values.every((v) => _text(v, 480)) &&
        _list(d['hints'], _steps.contains, 4) &&
        d['revealed'] is bool &&
        d['example'] is bool;
  }

  static bool _labs(Object? value) {
    if (!_exact(value, {
      'kind',
      'showHub',
      'camera',
      'speed',
      'snapshots',
      'histories',
      'drafts',
      'surface',
      'motion',
      'suspended',
    })) {
      return false;
    }
    final l = value! as Map<String, Object?>;
    if (!_activities.contains(l['kind']) ||
        l['showHub'] is! bool ||
        !_camera(l['camera']) ||
        !const [.25, .5, 1].contains(l['speed']) ||
        !_motion(l['motion']) ||
        !_allowed(l['suspended'], _activities) ||
        !(l['suspended']! as Map).values.every(_motion) ||
        !const [
          'snapshots',
          'histories',
          'drafts',
        ].every((k) => _exact(l[k], _activities))) {
      return false;
    }
    final snapshots = l['snapshots']! as Map;
    final histories = l['histories']! as Map;
    final drafts = l['drafts']! as Map;
    return _activities.every((kind) {
      if (!_labSnapshot(snapshots[kind], kind) ||
          !_list(histories[kind], (v) => _labSnapshot(v, kind), 30) ||
          !_exact(drafts[kind], {
            'prediction',
            'result',
            'explanation',
            'answer',
          })) {
        return false;
      }
      final d = drafts[kind] as Map;
      return _text(d['prediction'], 240) &&
          _text(d['result']) &&
          _text(d['explanation']) &&
          _text(d['answer'], 80);
    });
  }

  static bool _motion(Object? value) {
    if (value == null) {
      return true;
    }
    if (!_exact(value, {
      'type',
      'from',
      'to',
      'duration',
      'elapsed',
      'baseDuration',
      'compare',
    })) {
      return false;
    }
    final v = value as Map<String, Object?>;
    if (!const {
          'net',
          'area',
          'composite',
          'unit',
          'pour',
          'compare-fill',
          'compare-transfer',
        }.contains(v['type']) ||
        !_number(v['from'], 0, 1000000) ||
        !_number(v['to'], 0, 1000000) ||
        !_number(v['duration'], 1, 1000000) ||
        !_number(v['elapsed'], 0, (v['duration']! as num).toDouble()) ||
        !_number(v['baseDuration'], .000001, 1000000)) {
      return false;
    }
    if (!(v['type']! as String).startsWith('compare-')) {
      return v['compare'] == null;
    }
    if (!_exact(v['compare'], {
      'fromItems',
      'toItems',
      'fromSpill',
      'toSpill',
      'plan',
    })) {
      return false;
    }
    final c = v['compare']! as Map;
    bool items(Object? value) =>
        value is List &&
        value.length == 2 &&
        value.every(
          (item) =>
              _exact(item, {'key', 'd', 'fill'}) &&
              models.contains((item as Map)['key']) &&
              _dimensions(item['d']) &&
              _number(item['fill'], 0, 1),
        );
    return items(c['fromItems']) &&
        items(c['toItems']) &&
        _number(c['fromSpill'], 0, 1000000) &&
        _number(c['toSpill'], 0, 1000000) &&
        (v['type'] == 'compare-fill'
            ? c['plan'] == null
            : c['plan'] is Map<String, Object?>);
  }

  static bool _labSnapshot(Object? value, String kind) {
    if (value is! Map<String, Object?>) {
      return false;
    }
    if (kind == 'net') {
      return _net(value);
    }
    if (kind == 'volume') {
      return _volume(value);
    }
    if (kind == 'area') {
      return _area(value);
    }
    if (!_exact(value, {'comp'}) ||
        !_allowed(value['comp'], {
          'kind',
          'size',
          'h',
          't',
          'joined',
          'selected',
          'dirty',
          'feedback',
          'focusPending',
        })) {
      return false;
    }
    final c = value['comp']! as Map;
    return const {'roof', 'rocket'}.contains(c['kind']) &&
        _number(c['size'], .1, 1000) &&
        _number(c['h'], .1, 1000) &&
        _number(c['t'], .1, 1000) &&
        _number(c['joined'], 0, 1) &&
        _list(c['selected'], (v) => _text(v, 40));
  }

  static bool _net(Map<String, Object?> value) {
    if (!_exact(value, {'net', 'studio'}) ||
        !_allowed(value['net'], {
          'mode',
          'preset',
          'presetFace',
          'cells',
          'progress',
          'selected',
          'dirty',
          'presetDirty',
          'notice',
          'challenge',
          'manualRepair',
        })) {
      return false;
    }
    final n = value['net']! as Map;
    if (!const {'gallery', 'editor', 'studio'}.contains(n['mode']) ||
        !models.take(9).contains(n['preset']) ||
        !_number(n['progress'], 0, 1) ||
        !_integer(n['selected'], 0, 200) ||
        !_list(
          n['cells'],
          (v) =>
              _pair(v, -50, 50) &&
              (v! as List).every((n) => _integer(n, -50, 50)),
          36,
        )) {
      return false;
    }
    final studio = value['studio'];
    if (studio == null) {
      return true;
    }
    if (!_exact(studio, {
      'shape',
      'parents',
      'inside',
      'dimensions',
      'openFace',
    })) {
      return false;
    }
    final s = studio as Map;
    final parents = s['parents'];
    final inside = s['inside'];
    if (!models
            .difference({'cylinder', 'cone', 'sphere', 'hemisphere'})
            .contains(s['shape']) ||
        !_dimensions(s['dimensions']) ||
        parents is! List ||
        parents.length < 4 ||
        parents.length > 8 ||
        inside is! List ||
        inside.length != parents.length ||
        !inside.every((v) => v is bool) ||
        !_integer(s['openFace'], 0, parents.length - 1)) {
      return false;
    }
    for (var i = 0; i < parents.length; i++) {
      if (i == 0
          ? parents[i] != null
          : !_integer(parents[i], 0, parents.length - 1)) {
        return false;
      }
    }
    return true;
  }

  static bool _volume(Map<String, Object?> value) {
    if (!_exact(value, {'volume', 'compare'}) ||
        !_allowed(value['volume'], {
          'kind',
          'units',
          'd',
          'size',
          'height',
          'pours',
          'progress',
          'full',
        }) ||
        !_allowed(value['compare'], {
          'count',
          'transfer',
          'included',
          'amountRaw',
          'unit',
          'allowOverflow',
          'spill',
          'lastTransfer',
          'feedback',
          'items',
        })) {
      return false;
    }
    final a = value['volume']! as Map;
    final c = value['compare']! as Map;
    return const {'compare', 'unit', 'cone', 'pyramid'}.contains(a['kind']) &&
        _dimensions(a['d']) &&
        _number(a['units'], 0, 1000000) &&
        _number(a['size'], .1, 1000) &&
        _number(a['height'], .1, 1000) &&
        _integer(a['pours'], 0, 3) &&
        _number(a['progress'], 0, 1) &&
        a['full'] is bool &&
        const {1, 2}.contains(c['count']) &&
        _number(c['transfer'], 0, 1) &&
        c['included'] is List &&
        (c['included'] as List).length == 2 &&
        (c['included'] as List).every((v) => v is bool) &&
        _text(c['amountRaw'], 80) &&
        const {'cm3', 'mL', 'L', 'ml', 'l'}.contains(c['unit']) &&
        c['allowOverflow'] is bool &&
        _number(c['spill'], 0, 1000000) &&
        c['items'] is List &&
        (c['items'] as List).length == 2 &&
        (c['items'] as List).every(
          (v) =>
              _exact(v, {'key', 'd', 'fill'}) &&
              models.contains((v as Map)['key']) &&
              _dimensions(v['d']) &&
              _number(v['fill'], 0, 1),
        );
  }

  static bool _area(Map<String, Object?> value) {
    if (!_exact(value, {'area', 'workshop'}) ||
        !_allowed(value['area'], {
          'mode',
          'shape',
          'd',
          'progress',
          'selected',
          'focus',
          'dirty',
          'focusPending',
        })) {
      return false;
    }
    final a = value['area']! as Map;
    if (!const {'closed', 'container', 'cavity'}.contains(a['mode']) ||
        !models.contains(a['shape']) ||
        !_dimensions(a['d']) ||
        !_number(a['progress'], 0, 1) ||
        !_list(a['selected'], (v) => _integer(v, 0, 20))) {
      return false;
    }
    final workshop = value['workshop'];
    if (workshop == null) {
      return true;
    }
    if (!_exact(workshop, {'mode', 'shape', 'closed', 'd', 'selected'})) {
      return false;
    }
    final w = workshop as Map;
    return const {'container', 'cavity'}.contains(w['mode']) &&
        const {'cylinder', 'cuboid'}.contains(w['shape']) &&
        w['closed'] is bool &&
        _dimensions(w['d']) &&
        _list(w['selected'], (v) => _text(v, 40));
  }
}
