import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../design/geomath_theme.dart';

enum ActionButtonKind { primary, secondary, tonal, danger }

final class ActionButton extends StatelessWidget {
  const ActionButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.kind = ActionButtonKind.primary,
    this.busy = false,
    this.busyLabel,
    this.expanded = true,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final ActionButtonKind kind;
  final bool busy;
  final String? busyLabel;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final text = busy ? busyLabel ?? label : label;
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (busy) ...[
          SizedBox.square(
            dimension: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              value: MediaQuery.disableAnimationsOf(context) ? .5 : null,
            ),
          ),
          const SizedBox(width: 10),
        ] else if (icon != null) ...[
          Icon(icon, size: 20),
          const SizedBox(width: 10),
        ],
        Flexible(child: Text(text, textAlign: TextAlign.center)),
      ],
    );
    final callback = busy ? null : onPressed;
    final button = switch (kind) {
      ActionButtonKind.primary => FilledButton(
        onPressed: callback,
        child: child,
      ),
      ActionButtonKind.secondary => OutlinedButton(
        onPressed: callback,
        child: child,
      ),
      ActionButtonKind.tonal => FilledButton.tonal(
        onPressed: callback,
        style: FilledButton.styleFrom(
          backgroundColor: GeoMathColors.of(context).infoContainer,
          foregroundColor: GeoMathColors.of(context).primary,
        ),
        child: child,
      ),
      ActionButtonKind.danger => FilledButton(
        onPressed: callback,
        style: FilledButton.styleFrom(
          backgroundColor: GeoMathColors.of(context).dangerFill,
          foregroundColor: GeoMathColors.of(context).onDangerFill,
        ),
        child: child,
      ),
    };
    return Semantics(
      liveRegion: busy,
      child: SizedBox(width: expanded ? double.infinity : null, child: button),
    );
  }
}

final class LabeledField extends StatelessWidget {
  const LabeledField({
    required this.label,
    this.controller,
    this.onChanged,
    this.hint,
    this.helperText,
    this.errorText,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.enabled = true,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.autofillHints,
    this.inputFormatters,
    this.suffixIcon,
    this.focusNode,
    this.onFieldSubmitted,
    super.key,
  });

  final String label;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final String? hint;
  final String? helperText;
  final String? errorText;
  final FormFieldValidator<String>? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final bool enabled;
  final int maxLines;
  final int? minLines;
  final int? maxLength;
  final Iterable<String>? autofillHints;
  final List<TextInputFormatter>? inputFormatters;
  final Widget? suffixIcon;
  final FocusNode? focusNode;
  final ValueChanged<String>? onFieldSubmitted;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      ExcludeSemantics(
        child: Text(label, style: Theme.of(context).textTheme.labelLarge),
      ),
      const SizedBox(height: 8),
      Semantics(
        label: label,
        child: TextFormField(
          controller: controller,
          onChanged: onChanged,
          validator: validator,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          obscureText: obscureText,
          enabled: enabled,
          maxLines: obscureText ? 1 : maxLines,
          minLines: obscureText ? null : minLines,
          maxLength: maxLength,
          autofillHints: autofillHints,
          inputFormatters: inputFormatters,
          focusNode: focusNode,
          onFieldSubmitted: onFieldSubmitted,
          decoration: InputDecoration(
            hintText: hint,
            helperText: helperText,
            errorText: errorText,
            suffixIcon: suffixIcon,
          ),
        ),
      ),
    ],
  );
}

@immutable
final class ChoiceChipOption<T> {
  const ChoiceChipOption({required this.value, required this.label, this.icon});

  final T value;
  final String label;
  final IconData? icon;
}

final class ChoiceChips<T> extends StatelessWidget {
  const ChoiceChips({
    required this.options,
    required this.selected,
    required this.onSelected,
    this.enabled = true,
    super.key,
  });

  final List<ChoiceChipOption<T>> options;
  final T selected;
  final ValueChanged<T>? onSelected;
  final bool enabled;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final option in options)
          ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: GeoMathSpacing.touchTarget,
              minHeight: GeoMathSpacing.touchTarget,
              maxWidth: constraints.maxWidth,
            ),
            child: ChoiceChip(
              label: Text(option.label),
              avatar: option.icon == null ? null : Icon(option.icon, size: 20),
              selected: selected == option.value,
              onSelected: enabled && onSelected != null
                  ? (_) => onSelected!(option.value)
                  : null,
            ),
          ),
      ],
    ),
  );
}
