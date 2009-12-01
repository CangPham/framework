﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Signum.Utilities;

namespace Signum.Entities.Basics
{
    public interface INoteDN : IIdentifiable
    {
    }

    [Serializable]
    public class NoteDN : IdentifiableEntity, INoteDN
    {
        [ImplementedByAll]
        Lite<IdentifiableEntity> entity;
        public Lite<IdentifiableEntity> Entity
        {
            get { return entity; }
            set { Set(ref entity, value, () => Entity); }
        }

        [NotNullable, SqlDbType(Size = int.MaxValue)]
        string text;
        [StringLengthValidator(Min = 1)]
        public string Text
        {
            get { return text; }
            set { SetToStr(ref text, value, () => Text); }
        }

        public override string ToString()
        {
            return text.EtcLines(200);
        }
    }
}
