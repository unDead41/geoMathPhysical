import 'package:flutter/material.dart';

import 'controls.dart';

/// Caller owns the operation; the shared sheet only returns an explicit choice.
Future<bool> showGeoMathConfirmation(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  required String cancelLabel,
  bool danger = false,
}) async =>
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => ConfirmationSheet(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        danger: danger,
      ),
    ) ??
    false;

final class ConfirmationSheet extends StatelessWidget {
  const ConfirmationSheet({
    required this.title,
    required this.message,
    required this.confirmLabel,
    required this.cancelLabel,
    this.danger = false,
    super.key,
  });

  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final bool danger;

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          const SizedBox(height: 12),
          Text(message, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 24),
          ActionButton(
            label: confirmLabel,
            kind: danger ? ActionButtonKind.danger : ActionButtonKind.primary,
            onPressed: () => Navigator.of(context).pop(true),
          ),
          const SizedBox(height: 10),
          ActionButton(
            label: cancelLabel,
            kind: ActionButtonKind.secondary,
            onPressed: () => Navigator.of(context).pop(false),
          ),
        ],
      ),
    ),
  );
}

enum UnsavedChangesChoice { save, discard, stay }

Future<UnsavedChangesChoice> showUnsavedChangesDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String saveLabel,
  required String discardLabel,
  required String stayLabel,
}) async =>
    await showDialog<UnsavedChangesChoice>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(child: Text(message)),
        actionsOverflowDirection: VerticalDirection.down,
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.of(context).pop(UnsavedChangesChoice.stay),
            child: Text(stayLabel),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(context).pop(UnsavedChangesChoice.discard),
            child: Text(discardLabel),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(context).pop(UnsavedChangesChoice.save),
            child: Text(saveLabel),
          ),
        ],
      ),
    ) ??
    UnsavedChangesChoice.stay;
