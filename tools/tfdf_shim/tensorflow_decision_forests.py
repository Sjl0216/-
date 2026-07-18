"""Minimal shim for tensorflowjs conversion.

tensorflowjs unconditionally imports tensorflow_decision_forests when converting
SavedModel, but YOLO exports do not use TF-DF ops. This shim lets the converter
start without loading the incompatible native TF-DF package.
"""

__all__ = []
