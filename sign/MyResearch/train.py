import os
os.environ["ACCELERATE_DISABLE"] = "1"

from datasets import load_dataset

from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)
from config import Config


def tokenize(batch, tokenizer):
    return tokenizer(batch["text"], padding="max_length",
                     truncation=True, max_length=Config.MAX_LENGTH)


def train_model():
    dataset = load_dataset("dair-ai/emotion")

    tokenizer = AutoTokenizer.from_pretrained(Config.MODEL_NAME)
    dataset = dataset.map(lambda batch: tokenize(batch, tokenizer), batched=True)
    dataset = dataset.rename_column("label", "labels")
    dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"])

    model = AutoModelForSequenceClassification.from_pretrained(
        Config.MODEL_NAME,
        num_labels=Config.NUM_LABELS
    )

    training_args = TrainingArguments(
        output_dir=Config.MODEL_SAVE_DIR,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_dir="./logs",
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=2,
        optim="adamw_torch",
        use_cpu=True
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"]
    )

    trainer.train()
    trainer.save_model(Config.MODEL_SAVE_DIR)
    tokenizer.save_pretrained(Config.MODEL_SAVE_DIR)

    print("Training complete!")


if __name__ == "__main__":
    train_model()
