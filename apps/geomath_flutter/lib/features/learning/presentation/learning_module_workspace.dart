import 'package:flutter/material.dart';

/// Change only the axis: the activity keeps the same element and mounted
/// platform view when a phone rotates or a tablet changes window size.
final class LearningModuleWorkspace extends StatelessWidget {
  const LearningModuleWorkspace({
    required this.controls,
    required this.activity,
    super.key,
  });

  final Widget controls;
  final Widget activity;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      // These are the available content bounds after the native rail; a
      // 768dp tablet still has enough room for two panes at about 644dp.
      final wide = constraints.maxWidth >= 640;
      final controlsWidth = constraints.maxWidth < 768 ? 280.0 : 320.0;
      return Flex(
        direction: wide ? Axis.horizontal : Axis.vertical,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ConstrainedBox(
            constraints: wide
                ? BoxConstraints.tightFor(width: controlsWidth)
                : BoxConstraints(maxHeight: constraints.maxHeight * .42),
            child: SingleChildScrollView(child: controls),
          ),
          SizedBox(
            width: wide ? 1 : null,
            height: wide ? null : 1,
            child: ColoredBox(color: Theme.of(context).dividerColor),
          ),
          Expanded(child: activity),
        ],
      );
    },
  );
}
