"""Minimal shim for tensorflowjs conversion.

tensorflowjs imports tensorflow_hub for generic SavedModel support. The YOLO
SavedModel conversion path in this workspace does not rely on Hub-specific APIs.
"""

def resolve(handle):
    return handle


class Module:
    def __init__(self, module_path):
        self.module_path = module_path
