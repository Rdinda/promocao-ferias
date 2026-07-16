import os
import sys
import subprocess
import re

# Auto-install dependencies if not available
def install_dependencies():
    required_packages = ["qrcode", "pillow"]
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            print(f"Instalando dependência necessária: {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    install_dependencies()
    import qrcode
    from PIL import Image, ImageDraw, ImageFont
except Exception as e:
    print(f"Erro ao instalar dependências: {e}")
    sys.exit(1)

def sanitize_filename(name):
    # Substitui caracteres inválidos para nomes de arquivos
    name = re.sub(r'[\\/*?:"<>|]', "_", name)
    return name.strip()

def main():
    lista_path = "LISTA.MD"
    output_dir = "qrcodes"

    if not os.path.exists(lista_path):
        print(f"Erro: O arquivo '{lista_path}' não foi encontrado.")
        sys.exit(1)

    # Limpa a pasta qrcodes antiga para não misturar arquivos
    if os.path.exists(output_dir):
        print("Limpando arquivos antigos da pasta qrcodes...")
        for file in os.listdir(output_dir):
            if file.lower().endswith(".png"):
                try:
                    os.remove(os.path.join(output_dir, file))
                except Exception as e:
                    print(f"Não foi possível remover {file}: {e}")
    else:
        os.makedirs(output_dir, exist_ok=True)

    with open(lista_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    count = 0
    for index, line in enumerate(lines):
        line_str = line.strip()
        if not line_str:
            continue

        # Ignora a linha de cabeçalho
        if index == 0 and ("descri" in line_str.lower() or "link" in line_str.lower()):
            continue

        # Parse de descrição e URL
        description = ""
        url = ""
        if "\t" in line_str:
            parts = line_str.split("\t")
            description = parts[0].strip()
            url = parts[1].strip()
        else:
            # Caso o separador seja espaços
            parts = line_str.split()
            if len(parts) >= 2:
                url = parts[-1].strip()
                description = " ".join(parts[:-1]).strip()
            else:
                url = line_str
                description = "Promoção"

        if not url:
            continue

        # Corrige o typo de 'htttps://' para 'https://'
        corrected_url = re.sub(r"^htttps://", "https://", url)
        
        # Extrai o ID final da URL
        match = re.search(r"/([^/]+)$", corrected_url)
        code = match.group(1) if match else f"code_{index}"

        # Gera o nome de arquivo amigável
        safe_desc = sanitize_filename(description)
        filename = f"{safe_desc} - {code}.png"
        filepath = os.path.join(output_dir, filename)

        try:
            print(f"[{index}/{len(lines) - 1}] Gerando QR Code: {description} ({code}) -> {filename}")
            
            # 1. Gera o QR Code básico
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=3,
            )
            qr.add_data(corrected_url)
            qr.make(fit=True)

            # Transforma em imagem RGB
            qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
            qr_w, qr_h = qr_img.size

            # 2. Cria uma imagem maior com espaço extra abaixo para a descrição (Padding de 25px)
            text_padding = 25
            new_w = qr_w
            new_h = qr_h + text_padding

            combined_img = Image.new("RGB", (new_w, new_h), "white")
            combined_img.paste(qr_img, (0, 0))

            # 3. Escreve a descrição no rodapé
            draw = ImageDraw.Draw(combined_img)
            
            # Carrega a fonte Arial padrão do Windows se disponível, senão fonte default
            font_path = "C:\\Windows\\Fonts\\arial.ttf"
            font = None
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, 15)  # Tamanho 15 para melhor proporção
                except Exception:
                    font = ImageFont.load_default()
            else:
                font = ImageFont.load_default()

            # Calcula largura do texto para centralizar
            try:
                # Pillow >= 10.0.0
                text_box = draw.textbbox((0, 0), description, font=font)
                text_w = text_box[2] - text_box[0]
            except AttributeError:
                # Pillow antigo
                try:
                    text_w = draw.textsize(description, font=font)[0]
                except AttributeError:
                    text_w = len(description) * 8

            text_x = (new_w - text_w) // 2
            # Posiciona o texto logo no início da margem inferior do QR Code
            text_y = qr_h - 8

            # Desenha o texto em preto
            draw.text((text_x, text_y), description, fill="black", font=font)

            # Salva imagem final
            combined_img.save(filepath)
            count += 1

        except Exception as err:
            print(f"Erro ao gerar QR Code para a linha {index + 1}: {err}")

    print(f"\nSucesso! {count} QR Codes premium com descrição foram salvos na pasta '{output_dir}'.")

if __name__ == "__main__":
    main()
