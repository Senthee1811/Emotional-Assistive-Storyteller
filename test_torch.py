try:
    import torch
    print('torch ok')
except Exception as e:
    print('caught', type(e), e)
