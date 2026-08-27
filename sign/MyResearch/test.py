import tensorflow as tf

gpus = tf.config.list_physical_devices('GPU')
print(gpus)

for gpu in gpus:
    print(tf.config.experimental.get_device_details(gpu))
